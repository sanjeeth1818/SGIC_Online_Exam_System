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
        } catch (Exception e) {
            System.err.println("Warning: DatabaseMigrationRunner encountered an error: " + e.getMessage());
            // Non-critical — don't block startup
        }
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
}
