# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.




-- 1. Disable checks
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Delete data from child/mapping tables first
DELETE FROM test_student_group_students;
DELETE FROM test_student_groups;
DELETE FROM test_manual_questions;
DELETE FROM test_category_configs;
DELETE FROM question_options;
DELETE FROM student_exam_codes;

-- 3. Delete data from main tables
DELETE FROM submissions;
DELETE FROM tests;
DELETE FROM questions;
DELETE FROM students;
DELETE FROM categories;

-- 4. Reset ID counters (Auto-increment) to 1
ALTER TABLE test_student_group_students AUTO_INCREMENT = 1;
ALTER TABLE test_student_groups AUTO_INCREMENT = 1;
ALTER TABLE test_manual_questions AUTO_INCREMENT = 1;
ALTER TABLE test_category_configs AUTO_INCREMENT = 1;
ALTER TABLE question_options AUTO_INCREMENT = 1;
ALTER TABLE student_exam_codes AUTO_INCREMENT = 1;
ALTER TABLE submissions AUTO_INCREMENT = 1;
ALTER TABLE tests AUTO_INCREMENT = 1;
ALTER TABLE questions AUTO_INCREMENT = 1;
ALTER TABLE students AUTO_INCREMENT = 1;
ALTER TABLE categories AUTO_INCREMENT = 1;

-- 5. Re-enable checks
SET FOREIGN_KEY_CHECKS = 1;
