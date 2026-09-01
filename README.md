# 🎓 Campus 360: Your All-in-One University Hub

Welcome to **Campus 360**! We're building a digital ecosystem to solve the everyday chaos of university life. From finding a lost ID card and catching the right shuttle to reporting an issue and joining peer study groups — Campus 360 brings everything a student needs under one unified platform.

This project is developed as part of our **Software Development Lab** course.

---

##  Why Did We Build This?

University life involves juggling a lot of disjointed systems. Students miss important club announcements, struggle to find course materials, and often have no transparent way to track complaints. We designed Campus 360 to bridge this gap by connecting students, clubs, drivers, and the university administration seamlessly.

---

## 🚀 Key Features

- **Secure & Role-Based Access** — Dedicated interfaces tailored for Students, University Authorities, Clubs, and Drivers.
- **The "Study Zone" & Material Sharing** — Create peer study sessions, find study partners, and access a structured repository of past lecture notes and slides.
- **Transparent Complaint System** — A community-driven approach where complaints gain visibility through student upvotes and are officially tracked from "Pending" to "Handled" by authorities.
- **Live Shuttle Tracking** — Never miss a bus again. Real-time GPS tracking (powered by Google Maps API) shows exactly where the shuttle is.
- **Campus Marketplace** — A verified, student-only marketplace for buying and selling books, gadgets, and supplies securely.
- **Lost & Found** — A dedicated feed to report lost items or claim found ones, helping things return to their rightful owners faster.
- **Events & Announcements** — A centralized board for all club activities and official university notices.

---

## 🛠️ The Tech Stack

We kept our stack clean and efficient to ensure smooth performance and maintainability:

- **Frontend:** HTML5, CSS3, JavaScript 
- **Backend:** Java (Spring Boot)
- **Database:** MySQL
- **APIs & Tools:** Google Maps API, Postman, Maven

---

## 📁 Repository Structure

```text
campus-360/
├── backend/            # Spring Boot Application (Controllers, Services, Models)
├── frontend/           # HTML, CSS, JS and static assets
├── database/           # MySQL schema (schema.sql) and seeders
├── docs/               # Architecture diagrams, wireframes, and presentation decks
└── README.md
```

---

## 🚀 Getting Started


### Setup

```bash
# 1. Clone the repository
git clone https://github.com/<org-or-username>/campus-360.git

# 2. Move into the project directory
cd campus-360

# 3. Set up the database
mysql -u root -p < database/schema.sql

# 4. Configure application properties
# add your MySQL credentials and Google Maps API key
# in backend/src/main/resources/application.properties

# 5. Run the backend (Spring Boot)
cd backend
mvn spring-boot:run

# 6. Open the frontend
# simply open frontend/index.html in your browser,
# or serve it with your preferred local server
```

---

## 🌿 Branching Strategy

We keep things simple with a **feature-branch workflow**:

```
main        → stable, production-ready code (protected, no direct push)
 └── dev     → integration branch, all features merge here first
      ├── feature/auth
      ├── feature/lost-and-found
      ├── feature/announcements
      ├── feature/events
      ├── feature/complaints
      ├── feature/marketplace
      ├── feature/study-zone
      ├── feature/material-sharing
      └── feature/shuttle-tracking
```

**Ground rules:**
- Never push directly to `main`.
- Branch off `dev` for every new feature: `git checkout -b feature/your-feature-name`
- Open a Pull Request (PR) into `dev` once your feature is ready.
- Get at least one teammate's review and approval before merging.
- Merge `dev` → `main` periodically, once features are tested and stable.

---

## 🤝 Team Workflow

1. Pick a task/feature from the shared project board (GitHub Projects/Trello).
2. Pull the latest `dev` branch: `git pull origin dev`
3. Create your feature branch: `git checkout -b feature/your-feature-name`
4. Commit with clear, descriptive messages:
   ```bash
   git commit -m "feat: add lost and found post creation"
   ```
5. Push your branch: `git push origin feature/your-feature-name`
6. Open a Pull Request into `dev` on GitHub.
7. Get a review from at least one teammate before merging.
8. Resolve any conflicts locally, then merge.

### Commit Message Convention

```
feat:     new feature
fix:      bug fix
docs:     documentation changes
style:    formatting, missing semicolons, etc.
refactor: code change that neither fixes a bug nor adds a feature
test:     adding tests
chore:    maintenance tasks
```

---

## 👥 Team Members

| Name | Role | GitHub |
|---|---|---|
| S M Hasibur Rahman | Backend | [smhasiburrahamn](https://github.com/smhasiburrahman) |
| Md Sami Chowdhury | Backend | [RotenZen](https://github.com/RotenZen)|
| Md Mahamud Hasan | Frontend | [Mahamud-Hasan123](https://github.com/Mahamud-Hasan123)|
| Md Mir Adnan | Frontend | [miradnan](https://github.com/miradnan)|
| Md Shakib | Frontend | |


---

##  Acknowledgements

Built with plenty of coffee and late-night debugging sessions as part of the Software Development Lab course.
