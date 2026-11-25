package com.framezero.saved;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedItemRepository extends JpaRepository<SavedItem, Long> {

    List<SavedItem> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<SavedItem> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, SavedType type);

    Optional<SavedItem> findByUserIdAndTypeAndRefKey(Long userId, SavedType type, String refKey);

    Optional<SavedItem> findByUserIdAndRefKey(Long userId, String refKey);
}
