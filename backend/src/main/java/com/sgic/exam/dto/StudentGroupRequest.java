package com.sgic.exam.dto;

import lombok.Data;
import java.util.List;

@Data
public class StudentGroupRequest {
    private String examDate;
    private List<Long> studentIds;
}
