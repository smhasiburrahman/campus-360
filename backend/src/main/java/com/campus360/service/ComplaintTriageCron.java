package com.campus360.service;

import com.campus360.entity.Complaint;
import com.campus360.repository.ComplaintRepository;
import com.campus360.repository.PostLikeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ComplaintTriageCron {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private PostLikeRepository postLikeRepository;

    // Runs every night at midnight
    @Scheduled(cron = "0 0 0 * * ?")
    public void triageOldComplaints() {
        // Find complaints that are older than 7 days and still not_approved
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        List<Complaint> staleComplaints = complaintRepository.findByStatusAndCreatedAtBefore("not_approved", sevenDaysAgo);

        for (Complaint c : staleComplaints) {
            // Check secondary threshold (e.g., > 0 for testing, normally > 5)
            int upvotes = postLikeRepository.countByPostTypeAndPostIdAndReaction("complaint", c.getId(), "like");
            if (upvotes > 0) {
                System.out.println("Cron triaging complaint: " + c.getId());
                // We simulate an upvote reaction to trigger the triage logic
                // In a real scenario, you'd extract the triage logic into a separate method
                // and call it directly here.
            }
        }
    }
}
