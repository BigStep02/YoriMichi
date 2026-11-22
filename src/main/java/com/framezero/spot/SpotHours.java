package com.framezero.spot;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.MonthDay;

/** 계절·기간별 운영시간. 기간은 'MM-DD' 로 저장하고 해를 넘길 수 있음 */
@Entity
@Table(name = "spot_hours")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SpotHours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spot_id", nullable = false)
    private Spot spot;

    @Column(name = "start_md", nullable = false, length = 5)
    private String startMd;

    @Column(name = "end_md", nullable = false, length = 5)
    private String endMd;

    @Column(name = "open_time", length = 5)
    private String openTime;

    @Column(name = "close_time", length = 5)
    private String closeTime;

    /** NULL: 기본 정기휴일, "NONE": 이 기간은 정기휴일 없음 */
    @Column(name = "closed_days", length = 30)
    private String closedDays;

    /** 0/1 숫자 칸 (Oracle). 읽을 때는 isClosed() */
    @Column(name = "is_closed", nullable = false)
    @Getter(AccessLevel.NONE)
    private int closed;

    public boolean isClosed() {
        return closed == 1;
    }

    public boolean contains(LocalDate date) {
        String md = MonthDay.from(date).toString().substring(2);   // "--MM-DD" -> "MM-DD"
        return startMd.compareTo(endMd) <= 0
                ? md.compareTo(startMd) >= 0 && md.compareTo(endMd) <= 0
                : md.compareTo(startMd) >= 0 || md.compareTo(endMd) <= 0;
    }

    /** 기간 길이(일). 겹칠 때 짧은 쪽이 우선 */
    public int span() {
        int s = doy(startMd), e = doy(endMd);
        return e >= s ? e - s : 366 - s + e;
    }

    private static int doy(String md) {
        return LocalDate.of(2024, Integer.parseInt(md.substring(0, 2)), Integer.parseInt(md.substring(3))).getDayOfYear();
    }
}
