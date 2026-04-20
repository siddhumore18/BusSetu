# Real-Time Urban Public Transit Synchronization via Integrated GPS Telemetry and WebSocket Communication

**1st Given Name Surname**  
dept. name of organization (of Affiliation)  
name of organization (of Affiliation)  
City, Country  
email address or ORCID  

**2nd Given Name Surname**  
dept. name of organization (of Affiliation)  
name of organization (of Affiliation)  
City, Country  
email address or ORCID  

**3rd Given Name Surname**  
dept. name of organization (of Affiliation)  
name of organization (of Affiliation)  
City, Country  
email address or ORCID  

**4th Given Name Surname**  
dept. name of organization (of Affiliation)  
name of organization (of Affiliation)  
City, Country  
email address or ORCID   

**5th Given Name Surname**  
dept. name of organization (of Affiliation)  
name of organization (of Affiliation)  
City, Country  
email address or ORCID  

**6th Given Name Surname**  
dept. name of organization (of Affiliation)  
name of organization (of Affiliation)  
City, Country  
email address or ORCID  

---

### Abstract
This electronic document presents the design and implementation of **BusSetu**, a live bus tracking system designed to enhance urban mobility. The system leverages WebSocket technology for low-latency GPS broadcasting and the Haversine formula for precise distance measurement and arrival time estimation. By integrating three distinct user roles—citizens, drivers, and administrators—the platform provides a comprehensive solution for reducing passenger wait times and optimizing fleet management. The architecture utilizes a PostgreSQL database for persistent route topography and Node.js for real-time event handling. 

**Keywords**: GPS tracking, WebSocket, Real-time telemetry, Urban transit, ETA prediction

---

### I. INTRODUCTION
Reliability in public transportation is a critical factor in the adoption of sustainable urban mobility. Traditional bus systems often suffer from scheduling offsets due to traffic congestion and mechanical failures, leading to passenger uncertainty. This paper introduces BusSetu, an integrated IoT-based solution that bridges the information gap between transit providers and commuters. The system provides live visual feedback and dynamic ETAs using modern web technologies, ensuring that citizens can plan their journeys with high precision.

### II. SYSTEM ARCHITECTURE
#### A. Component Design
The BusSetu architecture is divided into three primary layers: the Edge Layer (Driver GPS broadcast), the Cloud Layer (Node.js/Express server), and the Client Layer (React-based citizen interface). Real-time communication is facilitated through the Socket.io protocol, which eliminates the overhead of traditional HTTP polling by establishing a persistent full-duplex connection between the driver's device and the server.

#### B. Data Integrity and Specifications
The database schema is designed for 3rd normal form (3NF) compliance, utilizing PostgreSQL. Key tables include 'users' for authenticated drivers and admins, 'trips' for tracking active deployments, and 'locations' for high-frequency GPS snapshots. These specifications ensure that historical data can be analyzed for future route optimization.

### III. TECHNICAL IMPLEMENTATION
#### A. Geolocation and Distance Algorithms
For Precise tracking, the system utilizes the Haversine formula to compute the great-circle distance between two points on a sphere. This calculation is essential for the "Trip Progress" timeline, where sequential stop distances are aggregated to provide an "Uber-like" arrival prediction. The formula used for distance *d* is:

$d = 2R \arcsin(\sqrt{\sin^2((φ2 - φ1)/2) + \cos φ1 \cos φ2 \sin^2((λ2 - λ1)/2)})$

#### B. Real-Time Broadcasting
The driver dashboard captures high-accuracy geolocation coordinates from the `navigator.geolocation` API. These coordinates are emitted as `driver_location` events. The server identifies the trip and broadcasts the `bus_position` event only to clients subscribed to that specific route, ensuring efficient bandwidth utilization.

#### C. Timeline and ETA Estimation
The citizen interface incorporates a vertical progress timeline. It dynamically calculates cascading ETAs by comparing the bus's current location against the ordered list of route stops. A fallback urban speed model (25 km/h) is applied when the bus is stationary to maintain prediction reliability during traffic stops.

#### D. Common Development Challenges
- **GPS Drift**: Handled via client-side filtering and precision thresholds.
- **State Management**: Managed using React Context to sync authentication across dashboards.
- **Concurrency**: Managed through PostgreSQL connection pooling to handle multiple simultaneous trip broadcasts.

### IV. SYSTEM EVALUATION
The template for our administrative dashboard includes a comprehensive suite for managing routes, stops, and fleet status. 

#### A. Administrator and Driver Orchestration
Administrators define the geospatial coordinates for each stop and link them sequentially to forms routes. Once a route is active, drivers can "Dispatch" a trip, which triggers the live tracking availability for citizens.

#### B. Headings and Navigation
Organizational devices such as the Admin Dashboard use hierarchical navigation to guide users through fleet management. Component heads such as "Active Operations Map" provide top-level visual feedback, while text heads identify specific CRUD (Create, Read, Update, Delete) operations for drivers and routes.

#### C. Figures and Performance
Figures and tables are placed at the top of the reporting columns. Real-time graphs indicate speed variations and trip duration accuracy. The use of Lucide React icons provides a premium visual aesthetic that enhances user engagement.

---

### ACKNOWLEDGMENT
The authors thank the development team for their contributions to the WebSocket optimization module and the municipal transit authority for providing the initial route data for KMT tracking validation.

### REFERENCES
1. G. Eason, B. Noble, and I. N. Sneddon, “On certain integrals of Lipschitz-Hankel type involving products of Bessel functions,” *Phil. Trans. Roy. Soc. London*, vol. A247, pp. 529–551, April 1955.
2. J. Clerk Maxwell, *A Treatise on Electricity and Magnetism*, 3rd ed., vol. 2. Oxford: Clarendon, 1892, pp.68–73.
3. Socket.io Documentation, "Real-time bidirectional event-based communication," [Online]. Available: https://socket.io/docs/v4/
4. PostgreSQL Global Development Group, "PostgreSQL 16 Documentation," [Online]. Available: https://www.postgresql.org/docs/16/index.html
