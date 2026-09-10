package br.com.goinsiders.match;

import jakarta.validation.constraints.*;
import java.util.List;

final class Models {
    record Creator(long id, String name, String handle, String creatorNiche, String productNiche,
                   String state, String city, long followers, double engagement, String bio, String color) {}
    record CreateDeal(@Positive long creatorId, @Min(100) @Max(100000000) long budgetCents,
                      @NotBlank @Size(max=1500) String brief) {}
    record UpdateDeal(@NotBlank String status, @NotBlank @Size(max=100) String owner,
                      @NotBlank @Size(max=1000) String note) {}
    record Decision(@NotNull Boolean accepted, @NotBlank @Size(max=1000) String note) {}
    record Quote(long budgetCents, long commissionCents, long executionCents, long totalCents, String commissionMode) {}
    record Deal(String id, String brandId, Creator creator, long budgetCents, long commissionCents,
                long executionCents, long totalCents, String commissionMode, String matchMode,
                String status, String brief, String owner, String createdAt, String updatedAt, List<Event> events) {}
    record Event(String actor, String status, String note, String createdAt) {}
}
