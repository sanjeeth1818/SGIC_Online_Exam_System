package com.sgic.exam.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Runs one-time schema fixes on startup to handle legacy columns
 * that Hibernate's ddl-auto=update cannot remove automatically.
 */
@Component
public class DatabaseMigrationRunner implements CommandLineRunner {

    @Autowired
    private DataSource dataSource;

    @Override
    public void run(String... args) throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            fixTestCodeColumn(conn);
            fixStudentExamCodeTable(conn);
            fixSubmissionTable(conn);
            fixQuestionsTable(conn);
            fixTestsTable(conn);
        } catch (Exception e) {
            System.err.println("Warning: DatabaseMigrationRunner encountered an error: " + e.getMessage());
            // Non-critical — don't block startup
        }
    }

    private void fixTestsTable(Connection conn) throws Exception {
        DatabaseMetaData meta = conn.getMetaData();
        ResultSet columns = meta.getColumns(null, null, "tests", "is_deleted");

        if (!columns.next()) {
            System.out.println("Migration: Adding 'is_deleted' column to 'tests' table...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE tests ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE");
                System.out.println("Migration: 'is_deleted' column added successfully.");
            }
        }
        columns.close();
    }

    /**
     * The 'test_code' column on the 'tests' table is a legacy column that was
     * removed from the Test entity but still exists in MySQL as NOT NULL without
     * a default value, causing inserts to fail with a 500.
     * This safely makes it nullable so existing rows are unaffected.
     */
    private void fixTestCodeColumn(Connection conn) throws Exception {
        DatabaseMetaData meta = conn.getMetaData();
        ResultSet columns = meta.getColumns(null, null, "tests", "test_code");

        if (columns.next()) {
            // Column exists — check if it's already nullable
            int nullable = columns.getInt("NULLABLE");
            if (nullable == DatabaseMetaData.columnNoNulls) {
                System.out.println("Migration: Fixing legacy 'test_code' column (making nullable)...");
                try (Statement stmt = conn.createStatement()) {
                    stmt.execute("ALTER TABLE tests MODIFY COLUMN test_code VARCHAR(255) NULL DEFAULT NULL");
                    System.out.println("Migration: 'test_code' column fixed successfully.");
                }
            } else {
                System.out.println("Migration: 'test_code' column already nullable — skipping.");
            }
        } else {
            System.out.println("Migration: 'test_code' column not found — skipping.");
        }
        columns.close();
    }

    private void fixStudentExamCodeTable(Connection conn) throws Exception {
        DatabaseMetaData meta = conn.getMetaData();

        // Check for additional_time
        ResultSet rs1 = meta.getColumns(null, null, "student_exam_codes", "additional_time");
        if (!rs1.next()) {
            System.out.println("Migration: Adding 'additional_time' to 'student_exam_codes'...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE student_exam_codes ADD COLUMN additional_time INT DEFAULT 0");
            }
        }
        rs1.close();

        // Check for time_extension_comment
        ResultSet rs2 = meta.getColumns(null, null, "student_exam_codes", "time_extension_comment");
        if (!rs2.next()) {
            System.out.println("Migration: Adding 'time_extension_comment' to 'student_exam_codes'...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE student_exam_codes ADD COLUMN time_extension_comment TEXT");
            }
        }
        rs2.close();

        // Check for assigned_question_ids
        ResultSet rs3 = meta.getColumns(null, null, "student_exam_codes", "assigned_question_ids");
        if (!rs3.next()) {
            System.out.println("Migration: Adding 'assigned_question_ids' to 'student_exam_codes'...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE student_exam_codes ADD COLUMN assigned_question_ids TEXT");
            }
        }
        rs3.close();

        // Check for started_at
        ResultSet rs4 = meta.getColumns(null, null, "student_exam_codes", "started_at");
        if (!rs4.next()) {
            System.out.println("Migration: Adding 'started_at' to 'student_exam_codes'...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE student_exam_codes ADD COLUMN started_at DATETIME");
            }
        }
        rs4.close();

        // Check for current_session_token
        ResultSet rs5 = meta.getColumns(null, null, "student_exam_codes", "current_session_token");
        if (!rs5.next()) {
            System.out.println("Migration: Adding 'current_session_token' to 'student_exam_codes'...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE student_exam_codes ADD COLUMN current_session_token VARCHAR(255)");
            }
        }
        rs5.close();

        // Check for is_reopened
        ResultSet rs6 = meta.getColumns(null, null, "student_exam_codes", "is_reopened");
        if (!rs6.next()) {
            System.out.println("Migration: Adding 'is_reopened' to 'student_exam_codes'...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE student_exam_codes ADD COLUMN is_reopened BOOLEAN DEFAULT FALSE");
            }
        }
        rs6.close();
    }

    private void fixSubmissionTable(Connection conn) throws Exception {
        DatabaseMetaData meta = conn.getMetaData();

        // Check for student_id
        ResultSet rs1 = meta.getColumns(null, null, "submissions", "student_id");
        if (!rs1.next()) {
            System.out.println("Migration: Adding 'student_id' to 'submissions'...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE submissions ADD COLUMN student_id BIGINT");
            }
        }
        rs1.close();

        // Check for exam_code
        ResultSet rs2 = meta.getColumns(null, null, "submissions", "exam_code");
        if (!rs2.next()) {
            System.out.println("Migration: Adding 'exam_code' to 'submissions'...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE submissions ADD COLUMN exam_code VARCHAR(10)");
            }
        }
        rs2.close();
    }

    private void fixQuestionsTable(Connection conn) throws Exception {
        DatabaseMetaData meta = conn.getMetaData();

        // Add 'status' column to questions if not present
        ResultSet rs1 = meta.getColumns(null, null, "questions", "status");
        if (!rs1.next()) {
            System.out.println("Migration: Adding 'status' to 'questions'...");
            try (Statement stmt = conn.createStatement()) {
                stmt.execute("ALTER TABLE questions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active'");
            }
            System.out.println("Migration: 'status' column added to 'questions'.");
        }
        rs1.close();
    }
}
