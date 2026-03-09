-- Massive Mock Data Set for SGIC Category Mastery Analysis Charts
-- This script inserts randomized historical submissions spanning the last 5 years with high density.
-- Execute this against your `sgic_exam` MySQL database.

USE sgic_exam;

-- Ensure categories table implies IQ
-- The detailedBreakdownJson needs to contain "categoryName": "IQ" and proper Correct/Incorrect markers.

-- Insert Submissions spanning 2022 to 2026

INSERT INTO submissions (student_name, student_email, test_name, score, total_questions, submitted_at, detailed_breakdown_json, answers_json, test_id)
VALUES
-- 2022 Q1
('Aarav Patel', 'aarav.p@example.com', 'Aptitude Test', 14, 20, '2022-01-15 10:30:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Saanvi Sharma', 'saanvi.s@example.com', 'Aptitude Test', 18, 20, '2022-01-22 14:15:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Aryan Gupta', 'aryan.g@example.com', 'Aptitude Test', 18, 20, '2022-02-05 09:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Diya Singh', 'diya.s@example.com', 'Aptitude Test', 12, 20, '2022-02-18 11:45:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Vivaan Verma', 'vivaan.v@example.com', 'Aptitude Test', 16, 20, '2022-03-10 13:20:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Aanya Kumar', 'aanya.k@example.com', 'Aptitude Test', 15, 20, '2022-03-25 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),

-- 2022 Q2
('Rohan Das', 'rohan.d@example.com', 'Aptitude Test', 19, 20, '2022-04-05 15:30:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Ishita Reddy', 'ishita.r@example.com', 'Aptitude Test', 14, 20, '2022-04-18 09:45:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Kabir Joshi', 'kabir.j@example.com', 'Aptitude Test', 17, 20, '2022-05-12 11:10:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Myra Nair', 'myra.n@example.com', 'Aptitude Test', 11, 20, '2022-05-28 14:50:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Dhruv Singh', 'dhruv.s@example.com', 'Aptitude Test', 20, 20, '2022-06-15 10:25:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Anaya Menon', 'anaya.m@example.com', 'Aptitude Test', 13, 20, '2022-06-29 16:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),

-- 2022 Q3
('Arnav Rao', 'arnav.r@example.com', 'Aptitude Test', 15, 20, '2022-07-10 09:15:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Kiara Iyer', 'kiara.i@example.com', 'Aptitude Test', 18, 20, '2022-07-25 13:40:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Kiaan Pillai', 'kiaan.p@example.com', 'Aptitude Test', 12, 20, '2022-08-08 11:05:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Pari Choudhary', 'pari.c@example.com', 'Aptitude Test', 17, 20, '2022-08-22 15:20:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Vihaan Sethi', 'vihaan.s@example.com', 'Aptitude Test', 14, 20, '2022-09-05 10:50:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Avni Bhatia', 'avni.b@example.com', 'Aptitude Test', 16, 20, '2022-09-20 14:30:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),

-- 2022 Q4
('Reyansh Kapoor', 'reyansh.k@example.com', 'Aptitude Test', 11, 20, '2022-10-12 09:20:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Meera Agarwal', 'meera.a@example.com', 'Aptitude Test', 19, 20, '2022-10-28 11:15:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Rudra Mistry', 'rudra.m@example.com', 'Aptitude Test', 13, 20, '2022-11-15 16:45:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Nisha Shah', 'nisha.s@example.com', 'Aptitude Test', 18, 20, '2022-11-25 10:30:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Dev Desai', 'dev.d@example.com', 'Aptitude Test', 15, 20, '2022-12-05 14:15:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Aditi Patel', 'aditi.p@example.com', 'Aptitude Test', 17, 20, '2022-12-18 09:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),


-- 2023 Q1
('Aarav Patel', 'aarav.p2@example.com', 'Aptitude Test', 16, 20, '2023-01-10 10:30:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Saanvi Sharma', 'saanvi.s2@example.com', 'Aptitude Test', 19, 20, '2023-01-25 14:15:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Aryan Gupta', 'aryan.g2@example.com', 'Aptitude Test', 14, 20, '2023-02-08 09:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Diya Singh', 'diya.s2@example.com', 'Aptitude Test', 18, 20, '2023-02-22 11:45:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Vivaan Verma', 'vivaan.v2@example.com', 'Aptitude Test', 13, 20, '2023-03-12 13:20:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Aanya Kumar', 'aanya.k2@example.com', 'Aptitude Test', 17, 20, '2023-03-28 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),

-- 2023 Q2
('Rohan Das', 'rohan.d2@example.com', 'Aptitude Test', 15, 20, '2023-04-12 15:30:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Ishita Reddy', 'ishita.r2@example.com', 'Aptitude Test', 18, 20, '2023-04-25 09:45:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Kabir Joshi', 'kabir.j2@example.com', 'Aptitude Test', 12, 20, '2023-05-10 11:10:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Myra Nair', 'myra.n2@example.com', 'Aptitude Test', 20, 20, '2023-05-25 14:50:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Dhruv Singh', 'dhruv.s2@example.com', 'Aptitude Test', 14, 20, '2023-06-08 10:25:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Anaya Menon', 'anaya.m2@example.com', 'Aptitude Test', 16, 20, '2023-06-22 16:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),

-- 2023 Q3
('Arnav Rao', 'arnav.r2@example.com', 'Aptitude Test', 11, 20, '2023-07-15 09:15:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Kiara Iyer', 'kiara.i2@example.com', 'Aptitude Test', 19, 20, '2023-07-28 13:40:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Kiaan Pillai', 'kiaan.p2@example.com', 'Aptitude Test', 15, 20, '2023-08-12 11:05:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Pari Choudhary', 'pari.c2@example.com', 'Aptitude Test', 18, 20, '2023-08-25 15:20:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Vihaan Sethi', 'vihaan.s2@example.com', 'Aptitude Test', 13, 20, '2023-09-10 10:50:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Avni Bhatia', 'avni.b2@example.com', 'Aptitude Test', 17, 20, '2023-09-22 14:30:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),

-- 2023 Q4
('Reyansh Kapoor', 'reyansh.k2@example.com', 'Aptitude Test', 16, 20, '2023-10-05 09:20:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Meera Agarwal', 'meera.a2@example.com', 'Aptitude Test', 14, 20, '2023-10-18 11:15:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Rudra Mistry', 'rudra.m2@example.com', 'Aptitude Test', 20, 20, '2023-11-12 16:45:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Nisha Shah', 'nisha.s2@example.com', 'Aptitude Test', 12, 20, '2023-11-28 10:30:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Dev Desai', 'dev.d2@example.com', 'Aptitude Test', 19, 20, '2023-12-10 14:15:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Aditi Patel', 'aditi.p2@example.com', 'Aptitude Test', 15, 20, '2023-12-20 09:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),

-- 2024 (Dense Data for 2024 and 2025 across all months)
('Student A', 'studenta@example.com', 'Aptitude Test', 16, 20, '2024-01-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student B', 'studentb@example.com', 'Aptitude Test', 18, 20, '2024-01-15 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student C', 'studentc@example.com', 'Aptitude Test', 13, 20, '2024-01-25 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student D', 'studentd@example.com', 'Aptitude Test', 19, 20, '2024-02-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student E', 'studente@example.com', 'Aptitude Test', 15, 20, '2024-02-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student F', 'studentf@example.com', 'Aptitude Test', 14, 20, '2024-02-28 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student G', 'studentg@example.com', 'Aptitude Test', 17, 20, '2024-03-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student H', 'studenth@example.com', 'Aptitude Test', 20, 20, '2024-03-15 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student I', 'studenti@example.com', 'Aptitude Test', 12, 20, '2024-03-25 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student J', 'studentj@example.com', 'Aptitude Test', 16, 20, '2024-04-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student K', 'studentk@example.com', 'Aptitude Test', 18, 20, '2024-04-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student L', 'studentl@example.com', 'Aptitude Test', 15, 20, '2024-04-28 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student M', 'studentm@example.com', 'Aptitude Test', 19, 20, '2024-05-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student N', 'studentn@example.com', 'Aptitude Test', 13, 20, '2024-05-15 11:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student O', 'studento@example.com', 'Aptitude Test', 17, 20, '2024-05-25 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student P', 'studentp@example.com', 'Aptitude Test', 14, 20, '2024-06-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student Q', 'studentq@example.com', 'Aptitude Test', 20, 20, '2024-06-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student R', 'studentr@example.com', 'Aptitude Test', 12, 20, '2024-06-28 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student S', 'students@example.com', 'Aptitude Test', 16, 20, '2024-07-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student T', 'studentt@example.com', 'Aptitude Test', 18, 20, '2024-07-15 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student U', 'studentu@example.com', 'Aptitude Test', 15, 20, '2024-07-25 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student V', 'studentv@example.com', 'Aptitude Test', 19, 20, '2024-08-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student W', 'studentw@example.com', 'Aptitude Test', 13, 20, '2024-08-18 11:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student X', 'studentx@example.com', 'Aptitude Test', 17, 20, '2024-08-28 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student Y', 'studenty@example.com', 'Aptitude Test', 14, 20, '2024-09-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student Z', 'studentz@example.com', 'Aptitude Test', 20, 20, '2024-09-15 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student AA', 'studentaa@example.com', 'Aptitude Test', 12, 20, '2024-09-25 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student BB', 'studentbb@example.com', 'Aptitude Test', 16, 20, '2024-10-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student CC', 'studentcc@example.com', 'Aptitude Test', 18, 20, '2024-10-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student DD', 'studentdd@example.com', 'Aptitude Test', 15, 20, '2024-10-28 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student EE', 'studentee@example.com', 'Aptitude Test', 19, 20, '2024-11-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student FF', 'studentff@example.com', 'Aptitude Test', 13, 20, '2024-11-15 11:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student GG', 'studentgg@example.com', 'Aptitude Test', 17, 20, '2024-11-25 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student HH', 'studenthh@example.com', 'Aptitude Test', 14, 20, '2024-12-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student II', 'studentii@example.com', 'Aptitude Test', 20, 20, '2024-12-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student JJ', 'studentjj@example.com', 'Aptitude Test', 12, 20, '2024-12-28 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),

-- 2025 Data
('Student KK', 'studentkk@example.com', 'Aptitude Test', 16, 20, '2025-01-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student LL', 'studentll@example.com', 'Aptitude Test', 18, 20, '2025-01-15 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student MM', 'studentmm@example.com', 'Aptitude Test', 13, 20, '2025-01-25 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student NN', 'studentnn@example.com', 'Aptitude Test', 19, 20, '2025-02-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student OO', 'studentoo@example.com', 'Aptitude Test', 15, 20, '2025-02-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student PP', 'studentpp@example.com', 'Aptitude Test', 14, 20, '2025-02-28 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student QQ', 'studentqq@example.com', 'Aptitude Test', 17, 20, '2025-03-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student RR', 'studentrr@example.com', 'Aptitude Test', 20, 20, '2025-03-15 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student SS', 'studentss@example.com', 'Aptitude Test', 12, 20, '2025-03-25 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student TT', 'studenttt@example.com', 'Aptitude Test', 16, 20, '2025-04-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student UU', 'studentuu@example.com', 'Aptitude Test', 18, 20, '2025-04-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student VV', 'studentvv@example.com', 'Aptitude Test', 15, 20, '2025-04-28 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student WW', 'studentww@example.com', 'Aptitude Test', 19, 20, '2025-05-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student XX', 'studentxx@example.com', 'Aptitude Test', 13, 20, '2025-05-15 11:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student YY', 'studentyy@example.com', 'Aptitude Test', 17, 20, '2025-05-25 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student ZZ', 'studentzz@example.com', 'Aptitude Test', 14, 20, '2025-06-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student AAA', 'studentaaa@example.com', 'Aptitude Test', 20, 20, '2025-06-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student BBB', 'studentbbb@example.com', 'Aptitude Test', 12, 20, '2025-06-28 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student CCC', 'studentccc@example.com', 'Aptitude Test', 16, 20, '2025-07-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student DDD', 'studentddd@example.com', 'Aptitude Test', 18, 20, '2025-07-15 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student EEE', 'studenteee@example.com', 'Aptitude Test', 15, 20, '2025-07-25 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student FFF', 'studentfff@example.com', 'Aptitude Test', 19, 20, '2025-08-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student GGG', 'studentggg@example.com', 'Aptitude Test', 13, 20, '2025-08-18 11:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student HHH', 'studenthhh@example.com', 'Aptitude Test', 17, 20, '2025-08-28 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student III', 'studentiii@example.com', 'Aptitude Test', 14, 20, '2025-09-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student JJJ', 'studentjjj@example.com', 'Aptitude Test', 20, 20, '2025-09-15 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student KKK', 'studentkkk@example.com', 'Aptitude Test', 12, 20, '2025-09-25 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student LLL', 'studentlll@example.com', 'Aptitude Test', 16, 20, '2025-10-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student MMM', 'studentmmm@example.com', 'Aptitude Test', 18, 20, '2025-10-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student NNN', 'studentnnn@example.com', 'Aptitude Test', 15, 20, '2025-10-28 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student OOO', 'studentooo@example.com', 'Aptitude Test', 19, 20, '2025-11-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student PPP', 'studentppp@example.com', 'Aptitude Test', 13, 20, '2025-11-15 11:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student QQQ', 'studentqqq@example.com', 'Aptitude Test', 17, 20, '2025-11-25 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student RRR', 'studentrrr@example.com', 'Aptitude Test', 14, 20, '2025-12-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student SSS', 'studentsss@example.com', 'Aptitude Test', 20, 20, '2025-12-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student TTT', 'studentttt@example.com', 'Aptitude Test', 12, 20, '2025-12-28 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),

-- 2026 Data (Current Year - Monthly spread)
('Student 1', 'student1@example.com', 'Aptitude Test', 16, 20, '2026-01-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student 2', 'student2@example.com', 'Aptitude Test', 18, 20, '2026-01-15 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student 3', 'student3@example.com', 'Aptitude Test', 13, 20, '2026-01-25 12:00:00', '[{"categoryName":"IQ", "correct":false}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student 4', 'student4@example.com', 'Aptitude Test', 19, 20, '2026-02-08 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student 5', 'student5@example.com', 'Aptitude Test', 15, 20, '2026-02-18 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student 6', 'student6@example.com', 'Aptitude Test', 14, 20, '2026-02-28 12:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":false}]', '[]', 1),
('Student 7', 'student7@example.com', 'Aptitude Test', 17, 20, '2026-03-05 10:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1),
('Student 8', 'student8@example.com', 'Aptitude Test', 20, 20, '2026-03-09 11:00:00', '[{"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}, {"categoryName":"IQ", "correct":true}]', '[]', 1);

-- To verify IQ data exists spanning 2022 to 2026, you can run:
-- SELECT COUNT(*), YEAR(submitted_at) FROM submissions GROUP BY YEAR(submitted_at) ORDER BY 2 DESC;
