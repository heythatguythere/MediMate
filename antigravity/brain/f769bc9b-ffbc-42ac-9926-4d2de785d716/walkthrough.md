# E-Commerce Project Walkthrough

## What Was Built

### Frontend (`frontend/`)
React + Vite app with Bootstrap UI:
- **Login** / **Signup** pages with role-based navigation
- **AdminDashboard** — product table with Add/Update/Delete
- **CustomerDashboard** — product cards with Buy button
- **AddProduct** / **UpdateProduct** — form pages
- Hardcoded admin: `2410030124@klh.edu.in` / `admin124`

### Backend (`backend/`)
Spring Boot 3.2.5 + MySQL + Spring Security:
- **Models**: `Product.java`, `User.java` (JPA entities)
- **Repositories**: `ProductRepository`, `UserRepository`
- **Services**: `ProductService` (CRUD), `UserService` (login/signup)
- **Controllers**: `ProductController` (`/api/products`), `AuthController` (`/api/auth`)
- **Config**: `SecurityConfig` (CSRF disabled, all requests permitted)
- **Port**: `8081`

## Validation
- ✅ Frontend compiles and runs on `http://localhost:5173/`
- ✅ Backend compiles successfully with `mvn compile`

## To Run
1. **Update MySQL password** in `backend/src/main/resources/application.properties`
2. Create the database: `CREATE DATABASE ecommerce_db;`
3. Insert admin: `INSERT INTO ecommerce_db.users (name, email, password, role) VALUES ('siva', 'siva@gmail.com', '4321', 'ADMIN');`
4. Start backend: `cd backend && mvn spring-boot:run`
5. Start frontend: `cd frontend && npm run dev`
