package com.framezero.saved;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "saved_items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SavedItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 20)
    private SavedType type;

    @Column(name = "ref_key", nullable = false, length = 400)
    private String refKey;

    @Column(name = "festival_id")
    private Long festivalId;

    @Column(name = "spot_id")
    private Long spotId;

    @Column(name = "place_id", length = 300)
    private String placeId;

    @Column(length = 20)
    private String prefecture;

    @Column(length = 100)
    private String city;

    @Column(name = "met_type", length = 20)
    private String metType;

    @Column(name = "met_id")
    private Long metId;

    @Column(length = 40)
    private String preset;

    @Lob
    @Column(name = "course_json")
    private String courseJson;

    @Column(length = 500)
    private String memo;

    /** 0/1 숫자 칸 (Oracle). 읽을 때는 isVisited() */
    @Column(nullable = false)
    @Getter(AccessLevel.NONE)
    private int visited;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public SavedItem(Long userId, SavedType type, String refKey, Long festivalId, Long spotId, String placeId,
                     String prefecture, String city, String metType, Long metId, String preset, String courseJson,
                     String memo) {
        this.userId = userId;
        this.type = type;
        this.refKey = refKey;
        this.festivalId = festivalId;
        this.spotId = spotId;
        this.placeId = placeId;
        this.prefecture = prefecture;
        this.city = city;
        this.metType = metType;
        this.metId = metId;
        this.preset = preset;
        this.courseJson = courseJson;
        this.memo = memo;
        this.visited = 0;
    }

    public boolean isVisited() {
        return visited == 1;
    }

    public void updateMemo(String memo) {
        this.memo = memo;
    }

    public void updateVisited(boolean visited) {
        this.visited = visited ? 1 : 0;
    }
}
