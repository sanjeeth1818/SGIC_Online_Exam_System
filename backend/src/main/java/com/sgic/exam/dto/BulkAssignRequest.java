package com.sgic.exam.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkAssignRequest {
    private List<Long> studentIds;
    private String examName;
    private String examDate;
    private String examTime;
}
