package com.campus360.service;

import com.campus360.dto.QuickActionDto;
import com.campus360.entity.Course;
import com.campus360.entity.Event;
import com.campus360.entity.MaterialShare;
import com.campus360.entity.ShuttleRoute;
import com.campus360.repository.CourseRepository;
import com.campus360.repository.EventRepository;
import com.campus360.repository.MaterialShareRepository;
import com.campus360.repository.ShuttleRouteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Enhanced Campus Knowledge Service.
 * Provides deep grounding in United International University (UIU),
 * real-time database context (materials, courses, routes, events),
 * and open general intelligence without restrictive canned replies.
 */
@Service
public class CampusKnowledgeService {

    @Autowired(required = false)
    private ShuttleRouteRepository shuttleRouteRepository;

    @Autowired(required = false)
    private EventRepository eventRepository;

    @Autowired(required = false)
    private MaterialShareRepository materialShareRepository;

    @Autowired(required = false)
    private CourseRepository courseRepository;

    private static final String BASE_SYSTEM_PROMPT = 
        "You are CampusBot, the AI assistant for Campus 360 at United International University (UIU).\n\n" +
        "### Guidelines:\n" +
        "1. **Concise & Direct (Speed First)**: Keep answers short, crisp, and directly to the point (2 to 4 sentences or a short bulleted list of 2-3 points). Never use introductory filler ('Hello! I would be glad to...'), long essays, or repetitive preambles. Answer immediately in the first sentence.\n" +
        "2. **Open Intelligence**: Freely answer general knowledge, coding, and academic questions accurately without refusal.\n" +
        "3. **Bangladesh Political Context**: Following the August 2024 political change, the post of Prime Minister of Bangladesh is vacant; the country is led by Nobel Laureate Dr. Muhammad Yunus as Chief Adviser of the Interim Government.\n" +
        "4. **UIU Key Facts**:\n" +
        "   - Tuition: ~6,500–7,000 BDT/credit (Total ~8.5–9.5 Lakh BDT for BSc in CSE across 12 trimesters, 138-141 credits).\n" +
        "   - Waivers: 25%–100% merit waivers for SSC/HSC GPA 5.0 or maintaining CGPA >= 3.50.\n" +
        "   - Fees: Admission ~20k-25k BDT, trimester lab/activity ~5k-8k BDT.\n" +
        "   - Location: United City, Madani Avenue, Badda, Dhaka 1212.\n" +
        "5. **Links**: Use concise markdown links when appropriate: [Course Materials](materials.html), [Course Planner](course-planner.html), [Live Shuttle Tracking](shuttle.html), [Events](events.html), [Complaints](complaints.html).\n";

    public String buildSystemInstruction(String userMessage) {
        StringBuilder instruction = new StringBuilder(BASE_SYSTEM_PROMPT);
        if (userMessage == null) return instruction.toString();

        String lower = userMessage.toLowerCase(Locale.ROOT);

        // Real-time Database Grounding: Study Materials
        if (lower.contains("material") || lower.contains("slide") || lower.contains("note") || lower.contains("lecture") || lower.contains("exam") || lower.contains("paper")) {
            instruction.append("\n### Live Database Status (Course Materials):\n");
            try {
                if (materialShareRepository != null) {
                    long totalMaterials = materialShareRepository.count();
                    instruction.append("- Total uploaded materials in system: ").append(totalMaterials).append("\n");
                    List<MaterialShare> recent = materialShareRepository.findAll(PageRequest.of(0, 5)).getContent();
                    if (!recent.isEmpty()) {
                        instruction.append("- Recent shared items: ");
                        for (MaterialShare m : recent) {
                            if (m.getTitle() != null && !m.getTitle().isBlank()) {
                                instruction.append("\"").append(m.getTitle()).append("\"; ");
                            }
                        }
                        instruction.append("\n");
                    }
                }
            } catch (Exception ignored) {}
            instruction.append("- Direct students to view and download these from [Course Materials](materials.html).\n");
        }

        // Real-time Database Grounding: Shuttles
        if (lower.contains("shuttle") || lower.contains("bus") || lower.contains("route") || lower.contains("transport")) {
            instruction.append("\n### Live Database Status (Shuttles):\n");
            try {
                if (shuttleRouteRepository != null) {
                    List<ShuttleRoute> routes = shuttleRouteRepository.findAll();
                    instruction.append("- Active route count: ").append(routes.size()).append("\n");
                    if (!routes.isEmpty()) {
                        instruction.append("- Routes: ");
                        for (ShuttleRoute r : routes) {
                            instruction.append(r.getName()).append("; ");
                        }
                        instruction.append("\n");
                    }
                }
            } catch (Exception ignored) {}
            instruction.append("- Direct students to [Live Shuttle Tracking](shuttle.html).\n");
        }

        // Real-time Database Grounding: Events
        if (lower.contains("event") || lower.contains("club") || lower.contains("seminar") || lower.contains("fest")) {
            instruction.append("\n### Live Database Status (Events):\n");
            try {
                if (eventRepository != null) {
                    List<Event> upcoming = eventRepository.findEvents(true, PageRequest.of(0, 5)).getContent();
                    instruction.append("- Upcoming events count: ").append(upcoming.size()).append("\n");
                    if (!upcoming.isEmpty()) {
                        instruction.append("- Events list: ");
                        for (Event e : upcoming) {
                            instruction.append("\"").append(e.getTitle()).append("\" on ").append(e.getEventDate()).append("; ");
                        }
                        instruction.append("\n");
                    }
                }
            } catch (Exception ignored) {}
            instruction.append("- Direct students to [Events Board](events.html).\n");
        }

        // Real-time Database Grounding: Courses
        if (lower.contains("course") || lower.contains("curriculum") || lower.contains("credit") || lower.contains("prerequisite") || lower.contains("planner")) {
            instruction.append("\n### Live Database Status (Curriculum):\n");
            try {
                if (courseRepository != null) {
                    long courseCount = courseRepository.count();
                    instruction.append("- Total courses cataloged in system: ").append(courseCount).append("\n");
                    List<Course> courses = courseRepository.findAll(PageRequest.of(0, 3)).getContent();
                    if (!courses.isEmpty()) {
                        instruction.append("- Sample courses: ");
                        for (Course c : courses) {
                            instruction.append(c.getCourseCode()).append(" (").append(c.getCourseName()).append("); ");
                        }
                        instruction.append("\n");
                    }
                }
            } catch (Exception ignored) {}
            instruction.append("- Direct students to [Course Planner](course-planner.html).\n");
        }

        return instruction.toString();
    }

    /**
     * Extracts relevant quick action buttons based on conversation context.
     */
    public List<QuickActionDto> extractQuickActions(String userMessage, String reply) {
        List<QuickActionDto> actions = new ArrayList<>();
        String text = ((userMessage != null ? userMessage : "") + " " + (reply != null ? reply : "")).toLowerCase(Locale.ROOT);

        if (text.contains("material") || text.contains("slide") || text.contains("note") || text.contains("paper")) {
            actions.add(new QuickActionDto("Course Materials", "materials.html", "fa-folder-open"));
        }
        if (text.contains("course") || text.contains("planner") || text.contains("prerequisite") || text.contains("credit") || text.contains("tuition") || text.contains("fee")) {
            actions.add(new QuickActionDto("Course Planner", "course-planner.html", "fa-wand-magic-sparkles"));
        }
        if (text.contains("shuttle") || text.contains("bus") || text.contains("route") || text.contains("driver")) {
            actions.add(new QuickActionDto("Track Shuttles", "shuttle.html", "fa-bus"));
        }
        if (text.contains("complaint") || text.contains("issue") || text.contains("report") || text.contains("grievance")) {
            actions.add(new QuickActionDto("File Complaint", "complaints.html", "fa-flag"));
        }
        if (text.contains("lost") || text.contains("found")) {
            actions.add(new QuickActionDto("Lost & Found", "lost-found.html", "fa-magnifying-glass"));
        }
        if (text.contains("event") || text.contains("club") || text.contains("fest")) {
            actions.add(new QuickActionDto("View Events", "events.html", "fa-calendar"));
        }
        if (text.contains("market") || text.contains("buy") || text.contains("sell") || text.contains("book")) {
            actions.add(new QuickActionDto("Marketplace", "marketplace.html", "fa-store"));
        }

        return actions.stream().distinct().limit(3).toList();
    }
}
