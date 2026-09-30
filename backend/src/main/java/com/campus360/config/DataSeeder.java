package com.campus360.config;

import com.campus360.entity.*;
import com.campus360.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UniversityAuthorityRepository authorityRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private ShuttleRepository shuttleRepository;

    @Autowired
    private ShuttleRouteRepository shuttleRouteRepository;

    @Autowired
    private RouteStopRepository routeStopRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (authorityRepository.findByEmail("admin@campus360.edu").isEmpty()) {
            UniversityAuthority admin = new UniversityAuthority();
            admin.setEmail("admin@campus360.edu");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setFullName("Super Admin");
            admin.setDesignation("System Administrator");
            admin.setRole("admin");
            admin.setIsActive(true);
            authorityRepository.save(admin);
            System.out.println("Seeded initial admin account: admin@campus360.edu / admin123");
        }

        // Driver 1: Karim
        if (driverRepository.findByEmail("driver@campus360.edu").isEmpty()) {
            Driver driver = new Driver();
            driver.setEmail("driver@campus360.edu");
            driver.setPasswordHash(passwordEncoder.encode("driver123"));
            driver.setFullName("Karim Driver (Shuttle 1)");
            driver.setPhone("01711001122");
            driver.setLicenseNo("LIC-1001");
            driver.setIsActive(true);
            driverRepository.save(driver);
            System.out.println("Seeded driver 1: driver@campus360.edu / driver123");
        }

        // Driver 2: Rahim
        if (driverRepository.findByEmail("driver2@campus360.edu").isEmpty()) {
            Driver driver2 = new Driver();
            driver2.setEmail("driver2@campus360.edu");
            driver2.setPasswordHash(passwordEncoder.encode("driver123"));
            driver2.setFullName("Rahim Driver (Shuttle 2)");
            driver2.setPhone("01711334455");
            driver2.setLicenseNo("LIC-1002");
            driver2.setIsActive(true);
            driverRepository.save(driver2);
            System.out.println("Seeded driver 2: driver2@campus360.edu / driver123");
        }

        // Shuttles (Buses)
        if (shuttleRepository.count() == 0) {
            Shuttle s1 = new Shuttle();
            s1.setVehicleNo("UIU Shuttle 01 (Bus A)");
            s1.setCapacity(35);
            s1.setIsActive(true);
            shuttleRepository.save(s1);

            Shuttle s2 = new Shuttle();
            s2.setVehicleNo("UIU Shuttle 02 (Bus B)");
            s2.setCapacity(35);
            s2.setIsActive(true);
            shuttleRepository.save(s2);
            System.out.println("Seeded UIU Shuttles 01 and 02");
        }

        // Routes & Stops
        List<ShuttleRoute> existingRoutes = shuttleRouteRepository.findAll();
        boolean hasNotunToUiu = existingRoutes.stream().anyMatch(r -> r.getName().contains("Notun Bazar") && r.getName().contains("UIU") && r.getName().startsWith("Notun"));
        boolean hasUiuToNotun = existingRoutes.stream().anyMatch(r -> r.getName().contains("UIU") && r.getName().contains("Notun Bazar") && r.getName().startsWith("UIU"));

        if (!hasNotunToUiu) {
            ShuttleRoute r1 = new ShuttleRoute();
            r1.setName("Notun Bazar ➔ UIU Campus (Direction A)");
            r1.setDescription("Forward route from Notun Bazar through Madani Ave to UIU Campus");
            r1.setIsActive(true);
            r1 = shuttleRouteRepository.save(r1);

            createStop(r1.getId(), "Notun Bazar", 1, "23.797778", "90.424222");
            createStop(r1.getId(), "Family Bazar", 2, "23.798222", "90.429167");
            createStop(r1.getId(), "Sayednagar Auto Stand", 3, "23.798778", "90.434972");
            createStop(r1.getId(), "Bashundhara Bitumen Gate", 4, "23.799694", "90.443472");
            createStop(r1.getId(), "Chef's Table (U-turn Point)", 5, "23.801083", "90.454250");
            createStop(r1.getId(), "Mosjid Al Mostofa", 6, "23.800222", "90.448667");
            createStop(r1.getId(), "UIU Campus", 7, "23.797417", "90.449944");
            System.out.println("Seeded Direction A Route and Stops: Notun Bazar -> UIU");
        }

        if (!hasUiuToNotun) {
            ShuttleRoute r2 = new ShuttleRoute();
            r2.setName("UIU Campus ➔ Notun Bazar (Direction B)");
            r2.setDescription("Reverse route from UIU Campus through Madani Ave to Notun Bazar");
            r2.setIsActive(true);
            r2 = shuttleRouteRepository.save(r2);

            createStop(r2.getId(), "UIU Campus", 1, "23.797417", "90.449944");
            createStop(r2.getId(), "Mosjid Al Mostofa", 2, "23.800222", "90.448667");
            createStop(r2.getId(), "Chef's Table (U-turn Point)", 3, "23.801083", "90.454250");
            createStop(r2.getId(), "Bashundhara Bitumen Gate", 4, "23.799694", "90.443472");
            createStop(r2.getId(), "Sayednagar Auto Stand", 5, "23.798778", "90.434972");
            createStop(r2.getId(), "Family Bazar", 6, "23.798222", "90.429167");
            createStop(r2.getId(), "Notun Bazar", 7, "23.797778", "90.424222");
            System.out.println("Seeded Direction B Route and Stops: UIU -> Notun Bazar");
        }
    }

    private void createStop(Integer routeId, String name, int seq, String lat, String lng) {
        RouteStop stop = new RouteStop();
        stop.setRouteId(routeId);
        stop.setStopName(name);
        stop.setSequenceNo(seq);
        stop.setLatitude(new BigDecimal(lat));
        stop.setLongitude(new BigDecimal(lng));
        routeStopRepository.save(stop);
    }
}
