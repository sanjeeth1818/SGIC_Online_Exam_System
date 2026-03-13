package com.sgic.exam.service;

import com.sgic.exam.dto.BulkAssignRequest;
import com.sgic.exam.dto.StatusUpdateRequest;
import com.sgic.exam.dto.StudentRequest;
import com.sgic.exam.dto.StudentResponse;
import java.util.List;

public interface StudentService {
    StudentResponse addStudent(StudentRequest request);

    List<StudentResponse> getAllStudents();

    StudentResponse getStudentById(Long id);

    StudentResponse updateStudent(Long id, StudentRequest request);

    StudentResponse updateStudentStatus(Long id, StatusUpdateRequest request);

    void bulkAssign(BulkAssignRequest request);

    void deleteStudent(Long id);
}
