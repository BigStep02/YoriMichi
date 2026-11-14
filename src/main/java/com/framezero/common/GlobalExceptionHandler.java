package com.framezero.common;

import com.framezero.auth.exception.DuplicateEmailException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "VALIDATION_ERROR", message));
    }

    // @RequestParam / @PathVariable 등 메서드 파라미터 검증 실패 (Spring 6.1+)
    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleMethodValidation(HandlerMethodValidationException e) {
        String message = e.getAllErrors().stream()
                .map(MessageSourceResolvable::getDefaultMessage)
                .filter(Objects::nonNull)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "VALIDATION_ERROR",
                        message.isBlank() ? "파라미터 검증 오류" : message));
    }

    // @Validated 컨트롤러에서 @DecimalMin/@DecimalMax 등 Bean Validation 직접 위반
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException e) {
        String message = e.getConstraintViolations().stream()
                .map(cv -> cv.getMessage())
                .filter(Objects::nonNull)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "VALIDATION_ERROR",
                        message.isBlank() ? "파라미터 검증 오류" : message));
    }

    @ExceptionHandler({EntityNotFoundException.class, NoSuchElementException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(404, "NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "BAD_REQUEST", e.getMessage()));
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(409, "DUPLICATE_EMAIL", e.getMessage()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse(409, "CONFLICT", "데이터 충돌이 발생했습니다."));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(403, "FORBIDDEN", "접근 권한이 없습니다."));
    }

    // lat=abc 처럼 파라미터 타입 변환 실패
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "BAD_REQUEST", "파라미터 형식이 올바르지 않습니다: " + e.getName()));
    }

    // 깨진 JSON, 본문 누락 등
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "BAD_REQUEST", "요청 본문을 읽을 수 없습니다."));
    }

    /**
     * 위에서 처리되지 않은 예외.
     * - Spring의 ErrorResponse 구현 예외(ResponseStatusException, NoResourceFoundException,
     *   MissingServletRequestParameterException, HttpRequestMethodNotSupportedException 등)는
     *   예외가 가진 상태 코드 그대로 응답
     * - 그 외는 진짜 서버 오류 → 500 + 스택트레이스 로그, 메시지는 숨김
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception e) {
        if (e instanceof org.springframework.web.ErrorResponse springError) {
            return fromSpringErrorResponse(springError, e);
        }
        log.error("Unhandled exception", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse(500, "INTERNAL_ERROR", "서버 오류가 발생했습니다."));
    }

    private ResponseEntity<ErrorResponse> fromSpringErrorResponse(org.springframework.web.ErrorResponse springError,
                                                                  Exception e) {
        HttpStatusCode statusCode = springError.getStatusCode();
        int status = statusCode.value();
        HttpStatus resolved = HttpStatus.resolve(status);
        String code = resolved != null ? resolved.name() : "ERROR";

        String message = springError.getBody().getDetail();
        if (message == null || message.isBlank()) {
            message = defaultMessage(status);
        }

        if (statusCode.is5xxServerError()) {
            log.error("Server error response: {}", status, e);
        }
        return ResponseEntity.status(status)
                .headers(springError.getHeaders())   // 405의 Allow 헤더 등 유지
                .body(new ErrorResponse(status, code, message));
    }

    private static String defaultMessage(int status) {
        return switch (status) {
            case 400 -> "잘못된 요청입니다.";
            case 401 -> "인증이 필요합니다.";
            case 403 -> "접근 권한이 없습니다.";
            case 404 -> "요청한 리소스를 찾을 수 없습니다.";
            case 405 -> "허용되지 않는 HTTP 메서드입니다.";
            case 406 -> "지원하지 않는 응답 형식입니다.";
            case 409 -> "요청이 현재 상태와 충돌합니다.";
            case 415 -> "지원하지 않는 요청 형식입니다.";
            default -> status >= 500 ? "서버 오류가 발생했습니다." : "요청을 처리할 수 없습니다.";
        };
    }
}
