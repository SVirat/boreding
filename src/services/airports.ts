import { Airport } from "../lib/types";

/**
 * Comprehensive world airport database (~500 airports) with coordinates
 * for accurate great-circle flight duration estimation.
 *
 * Format: [iata, name, city, country, lat, lon]
 */
const RAW: [string, string, string, string, number, number][] = [
  // ─── United States ────────────────────────────────────
  ["JFK", "John F. Kennedy International", "New York", "United States", 40.64, -73.78],
  ["LAX", "Los Angeles International", "Los Angeles", "United States", 33.94, -118.41],
  ["ORD", "O'Hare International", "Chicago", "United States", 41.98, -87.90],
  ["SFO", "San Francisco International", "San Francisco", "United States", 37.62, -122.38],
  ["MIA", "Miami International", "Miami", "United States", 25.79, -80.29],
  ["ATL", "Hartsfield-Jackson Atlanta International", "Atlanta", "United States", 33.64, -84.43],
  ["SEA", "Seattle-Tacoma International", "Seattle", "United States", 47.45, -122.31],
  ["BOS", "Boston Logan International", "Boston", "United States", 42.37, -71.02],
  ["DEN", "Denver International", "Denver", "United States", 39.86, -104.67],
  ["DFW", "Dallas/Fort Worth International", "Dallas", "United States", 32.90, -97.04],
  ["EWR", "Newark Liberty International", "Newark", "United States", 40.69, -74.17],
  ["IAH", "George Bush Intercontinental", "Houston", "United States", 29.98, -95.34],
  ["MCO", "Orlando International", "Orlando", "United States", 28.43, -81.31],
  ["PHX", "Phoenix Sky Harbor International", "Phoenix", "United States", 33.44, -112.01],
  ["IAD", "Washington Dulles International", "Washington D.C.", "United States", 38.94, -77.46],
  ["DCA", "Ronald Reagan Washington National", "Washington D.C.", "United States", 38.85, -77.04],
  ["MSP", "Minneapolis-Saint Paul International", "Minneapolis", "United States", 44.88, -93.22],
  ["DTW", "Detroit Metropolitan", "Detroit", "United States", 42.21, -83.35],
  ["CLT", "Charlotte Douglas International", "Charlotte", "United States", 35.21, -80.94],
  ["LAS", "Harry Reid International", "Las Vegas", "United States", 36.08, -115.15],
  ["PHL", "Philadelphia International", "Philadelphia", "United States", 39.87, -75.24],
  ["BWI", "Baltimore/Washington International", "Baltimore", "United States", 39.18, -76.67],
  ["SAN", "San Diego International", "San Diego", "United States", 32.73, -117.19],
  ["TPA", "Tampa International", "Tampa", "United States", 27.98, -82.53],
  ["PDX", "Portland International", "Portland", "United States", 45.59, -122.60],
  ["FLL", "Fort Lauderdale-Hollywood International", "Fort Lauderdale", "United States", 26.07, -80.15],
  ["SLC", "Salt Lake City International", "Salt Lake City", "United States", 40.79, -111.98],
  ["STL", "St. Louis Lambert International", "St. Louis", "United States", 38.75, -90.37],
  ["SJC", "Norman Y. Mineta San Jose International", "San Jose", "United States", 37.36, -121.93],
  ["HNL", "Daniel K. Inouye International", "Honolulu", "United States", 21.32, -157.92],
  ["OAK", "Oakland International", "Oakland", "United States", 37.72, -122.22],
  ["AUS", "Austin-Bergstrom International", "Austin", "United States", 30.19, -97.67],
  ["BNA", "Nashville International", "Nashville", "United States", 36.12, -86.68],
  ["RDU", "Raleigh-Durham International", "Raleigh", "United States", 35.88, -78.79],
  ["MCI", "Kansas City International", "Kansas City", "United States", 39.30, -94.71],
  ["SMF", "Sacramento International", "Sacramento", "United States", 38.70, -121.59],
  ["CLE", "Cleveland Hopkins International", "Cleveland", "United States", 41.41, -81.85],
  ["IND", "Indianapolis International", "Indianapolis", "United States", 39.72, -86.29],
  ["PIT", "Pittsburgh International", "Pittsburgh", "United States", 40.50, -80.23],
  ["CMH", "John Glenn Columbus International", "Columbus", "United States", 39.99, -82.89],
  ["CVG", "Cincinnati/Northern Kentucky International", "Cincinnati", "United States", 39.05, -84.66],
  ["MKE", "Milwaukee Mitchell International", "Milwaukee", "United States", 42.95, -87.90],
  ["MSY", "Louis Armstrong New Orleans International", "New Orleans", "United States", 29.99, -90.26],
  ["RSW", "Southwest Florida International", "Fort Myers", "United States", 26.54, -81.76],
  ["ANC", "Ted Stevens Anchorage International", "Anchorage", "United States", 61.17, -150.00],
  ["JAX", "Jacksonville International", "Jacksonville", "United States", 30.49, -81.69],
  ["OMA", "Eppley Airfield", "Omaha", "United States", 41.30, -95.89],
  ["ABQ", "Albuquerque International Sunport", "Albuquerque", "United States", 35.04, -106.61],
  ["BUF", "Buffalo Niagara International", "Buffalo", "United States", 42.94, -78.73],
  ["RNO", "Reno-Tahoe International", "Reno", "United States", 39.50, -119.77],
  ["OKC", "Will Rogers World", "Oklahoma City", "United States", 35.39, -97.60],
  ["RIC", "Richmond International", "Richmond", "United States", 37.51, -77.32],
  ["MEM", "Memphis International", "Memphis", "United States", 35.04, -89.98],

  // ─── Canada ───────────────────────────────────────────
  ["YYZ", "Toronto Pearson International", "Toronto", "Canada", 43.68, -79.63],
  ["YVR", "Vancouver International", "Vancouver", "Canada", 49.19, -123.18],
  ["YUL", "Montréal-Trudeau International", "Montreal", "Canada", 45.47, -73.74],
  ["YYC", "Calgary International", "Calgary", "Canada", 51.11, -114.02],
  ["YEG", "Edmonton International", "Edmonton", "Canada", 53.31, -113.58],
  ["YOW", "Ottawa Macdonald-Cartier International", "Ottawa", "Canada", 45.32, -75.67],
  ["YHZ", "Halifax Stanfield International", "Halifax", "Canada", 44.88, -63.51],
  ["YWG", "Winnipeg James Armstrong Richardson International", "Winnipeg", "Canada", 49.91, -97.24],
  ["YQB", "Québec City Jean Lesage International", "Quebec City", "Canada", 46.79, -71.39],

  // ─── United Kingdom ───────────────────────────────────
  ["LHR", "Heathrow", "London", "United Kingdom", 51.47, -0.46],
  ["LGW", "Gatwick", "London", "United Kingdom", 51.15, -0.19],
  ["STN", "Stansted", "London", "United Kingdom", 51.89, 0.26],
  ["LTN", "Luton", "London", "United Kingdom", 51.87, -0.37],
  ["MAN", "Manchester", "Manchester", "United Kingdom", 53.36, -2.27],
  ["EDI", "Edinburgh", "Edinburgh", "United Kingdom", 55.95, -3.37],
  ["BHX", "Birmingham", "Birmingham", "United Kingdom", 52.45, -1.75],
  ["GLA", "Glasgow", "Glasgow", "United Kingdom", 55.87, -4.43],
  ["BRS", "Bristol", "Bristol", "United Kingdom", 51.38, -2.72],
  ["BFS", "Belfast International", "Belfast", "United Kingdom", 54.66, -6.22],
  ["LCY", "London City", "London", "United Kingdom", 51.51, 0.05],
  ["NCL", "Newcastle", "Newcastle", "United Kingdom", 55.04, -1.69],

  // ─── France ───────────────────────────────────────────
  ["CDG", "Charles de Gaulle", "Paris", "France", 49.01, 2.55],
  ["ORY", "Orly", "Paris", "France", 48.73, 2.36],
  ["NCE", "Nice Côte d'Azur", "Nice", "France", 43.66, 7.22],
  ["LYS", "Lyon-Saint Exupéry", "Lyon", "France", 45.73, 5.08],
  ["MRS", "Marseille Provence", "Marseille", "France", 43.44, 5.21],
  ["TLS", "Toulouse-Blagnac", "Toulouse", "France", 43.63, 1.37],
  ["BOD", "Bordeaux-Mérignac", "Bordeaux", "France", 44.83, -0.72],
  ["NTE", "Nantes Atlantique", "Nantes", "France", 47.15, -1.61],

  // ─── Germany ──────────────────────────────────────────
  ["FRA", "Frankfurt", "Frankfurt", "Germany", 50.03, 8.57],
  ["MUC", "Munich", "Munich", "Germany", 48.35, 11.79],
  ["BER", "Berlin Brandenburg", "Berlin", "Germany", 52.37, 13.52],
  ["HAM", "Hamburg", "Hamburg", "Germany", 53.63, 9.99],
  ["DUS", "Düsseldorf", "Düsseldorf", "Germany", 51.29, 6.77],
  ["CGN", "Cologne Bonn", "Cologne", "Germany", 50.87, 7.14],
  ["STR", "Stuttgart", "Stuttgart", "Germany", 48.69, 9.22],
  ["HAJ", "Hannover", "Hannover", "Germany", 52.46, 9.69],
  ["NUE", "Nuremberg", "Nuremberg", "Germany", 49.50, 11.08],

  // ─── Spain ────────────────────────────────────────────
  ["MAD", "Barajas", "Madrid", "Spain", 40.47, -3.57],
  ["BCN", "El Prat", "Barcelona", "Spain", 41.30, 2.08],
  ["PMI", "Palma de Mallorca", "Palma de Mallorca", "Spain", 39.55, 2.74],
  ["AGP", "Málaga-Costa del Sol", "Málaga", "Spain", 36.67, -4.50],
  ["ALC", "Alicante-Elche", "Alicante", "Spain", 38.28, -0.56],
  ["TFS", "Tenerife South", "Tenerife", "Spain", 28.04, -16.57],
  ["LPA", "Gran Canaria", "Las Palmas", "Spain", 27.93, -15.39],
  ["SVQ", "Seville", "Seville", "Spain", 37.42, -5.90],
  ["BIO", "Bilbao", "Bilbao", "Spain", 43.30, -2.91],
  ["VLC", "Valencia", "Valencia", "Spain", 39.49, -0.47],
  ["IBZ", "Ibiza", "Ibiza", "Spain", 38.87, 1.37],

  // ─── Italy ────────────────────────────────────────────
  ["FCO", "Fiumicino", "Rome", "Italy", 41.80, 12.25],
  ["MXP", "Malpensa", "Milan", "Italy", 45.63, 8.72],
  ["LIN", "Linate", "Milan", "Italy", 45.45, 9.28],
  ["VCE", "Marco Polo", "Venice", "Italy", 45.51, 12.35],
  ["NAP", "Capodichino", "Naples", "Italy", 40.89, 14.29],
  ["BGY", "Orio al Serio", "Bergamo", "Italy", 45.67, 9.70],
  ["BLQ", "Guglielmo Marconi", "Bologna", "Italy", 44.54, 11.29],
  ["FLR", "Peretola", "Florence", "Italy", 43.81, 11.20],
  ["CTA", "Fontanarossa", "Catania", "Italy", 37.47, 15.07],
  ["PSA", "Galileo Galilei", "Pisa", "Italy", 43.68, 10.39],
  ["PMO", "Falcone-Borsellino", "Palermo", "Italy", 38.18, 13.09],

  // ─── Netherlands & Belgium ────────────────────────────
  ["AMS", "Schiphol", "Amsterdam", "Netherlands", 52.31, 4.76],
  ["EIN", "Eindhoven", "Eindhoven", "Netherlands", 51.45, 5.37],
  ["BRU", "Brussels", "Brussels", "Belgium", 50.90, 4.48],
  ["CRL", "Brussels South Charleroi", "Charleroi", "Belgium", 50.46, 4.45],

  // ─── Switzerland ──────────────────────────────────────
  ["ZRH", "Zurich", "Zurich", "Switzerland", 47.46, 8.55],
  ["GVA", "Geneva", "Geneva", "Switzerland", 46.24, 6.11],
  ["BSL", "Basel-Mulhouse-Freiburg", "Basel", "Switzerland", 47.60, 7.53],

  // ─── Austria ──────────────────────────────────────────
  ["VIE", "Vienna International", "Vienna", "Austria", 48.11, 16.57],
  ["SZG", "Salzburg", "Salzburg", "Austria", 47.79, 13.00],
  ["INN", "Innsbruck", "Innsbruck", "Austria", 47.26, 11.34],

  // ─── Portugal ─────────────────────────────────────────
  ["LIS", "Humberto Delgado", "Lisbon", "Portugal", 38.77, -9.13],
  ["OPO", "Francisco Sá Carneiro", "Porto", "Portugal", 41.24, -8.68],
  ["FAO", "Faro", "Faro", "Portugal", 37.01, -7.97],
  ["FNC", "Madeira", "Funchal", "Portugal", 32.69, -16.77],

  // ─── Greece ───────────────────────────────────────────
  ["ATH", "Eleftherios Venizelos", "Athens", "Greece", 37.94, 23.94],
  ["SKG", "Thessaloniki Macedonia", "Thessaloniki", "Greece", 40.52, 22.97],
  ["HER", "Heraklion Nikos Kazantzakis", "Heraklion", "Greece", 35.34, 25.18],
  ["JTR", "Santorini", "Santorini", "Greece", 36.40, 25.48],
  ["JMK", "Mykonos", "Mykonos", "Greece", 37.44, 25.35],
  ["CFU", "Corfu", "Corfu", "Greece", 39.60, 19.91],
  ["RHO", "Rhodes Diagoras", "Rhodes", "Greece", 36.41, 28.09],

  // ─── Turkey ───────────────────────────────────────────
  ["IST", "Istanbul", "Istanbul", "Turkey", 41.26, 28.74],
  ["SAW", "Sabiha Gökçen", "Istanbul", "Turkey", 40.90, 29.31],
  ["ESB", "Esenboğa", "Ankara", "Turkey", 40.13, 32.00],
  ["AYT", "Antalya", "Antalya", "Turkey", 36.90, 30.79],
  ["ADB", "Adnan Menderes", "Izmir", "Turkey", 38.29, 27.16],
  ["DLM", "Dalaman", "Dalaman", "Turkey", 36.71, 28.79],
  ["BJV", "Milas-Bodrum", "Bodrum", "Turkey", 37.25, 27.66],

  // ─── Scandinavia & Iceland ────────────────────────────
  ["CPH", "Copenhagen", "Copenhagen", "Denmark", 55.62, 12.66],
  ["ARN", "Stockholm Arlanda", "Stockholm", "Sweden", 59.65, 17.95],
  ["GOT", "Gothenburg Landvetter", "Gothenburg", "Sweden", 57.66, 12.29],
  ["OSL", "Oslo Gardermoen", "Oslo", "Norway", 60.19, 11.10],
  ["BGO", "Bergen Flesland", "Bergen", "Norway", 60.29, 5.22],
  ["TRD", "Trondheim Værnes", "Trondheim", "Norway", 63.46, 10.92],
  ["HEL", "Helsinki-Vantaa", "Helsinki", "Finland", 60.32, 24.97],
  ["KEF", "Keflavík International", "Reykjavik", "Iceland", 63.99, -22.62],

  // ─── Eastern Europe ───────────────────────────────────
  ["PRG", "Václav Havel", "Prague", "Czech Republic", 50.10, 14.26],
  ["BUD", "Budapest Ferenc Liszt", "Budapest", "Hungary", 47.44, 19.26],
  ["WAW", "Chopin", "Warsaw", "Poland", 52.17, 20.97],
  ["KRK", "John Paul II", "Krakow", "Poland", 50.08, 19.78],
  ["GDN", "Gdańsk Lech Wałęsa", "Gdańsk", "Poland", 54.38, 18.47],
  ["OTP", "Henri Coandă", "Bucharest", "Romania", 44.57, 26.09],
  ["CLJ", "Cluj-Napoca", "Cluj-Napoca", "Romania", 46.79, 23.69],
  ["SOF", "Sofia", "Sofia", "Bulgaria", 42.70, 23.41],
  ["BEG", "Nikola Tesla", "Belgrade", "Serbia", 44.82, 20.31],
  ["ZAG", "Franjo Tuđman", "Zagreb", "Croatia", 45.74, 16.07],
  ["SPU", "Split", "Split", "Croatia", 43.54, 16.30],
  ["DBV", "Dubrovnik", "Dubrovnik", "Croatia", 42.56, 18.27],
  ["LJU", "Jože Pučnik", "Ljubljana", "Slovenia", 46.22, 14.46],
  ["TLL", "Lennart Meri", "Tallinn", "Estonia", 59.42, 24.83],
  ["RIX", "Riga", "Riga", "Latvia", 56.92, 23.97],
  ["VNO", "Vilnius", "Vilnius", "Lithuania", 54.63, 25.29],
  ["KBP", "Boryspil", "Kyiv", "Ukraine", 50.35, 30.89],

  // ─── Ireland ──────────────────────────────────────────
  ["DUB", "Dublin", "Dublin", "Ireland", 53.43, -6.27],
  ["SNN", "Shannon", "Shannon", "Ireland", 52.70, -8.92],
  ["ORK", "Cork", "Cork", "Ireland", 51.84, -8.49],

  // ─── Russia ───────────────────────────────────────────
  ["SVO", "Sheremetyevo", "Moscow", "Russia", 55.97, 37.41],
  ["DME", "Domodedovo", "Moscow", "Russia", 55.41, 37.91],
  ["LED", "Pulkovo", "Saint Petersburg", "Russia", 59.80, 30.27],

  // ─── Middle East ──────────────────────────────────────
  ["DXB", "Dubai International", "Dubai", "UAE", 25.25, 55.36],
  ["AUH", "Abu Dhabi International", "Abu Dhabi", "UAE", 24.43, 54.65],
  ["SHJ", "Sharjah International", "Sharjah", "UAE", 25.33, 55.52],
  ["DOH", "Hamad International", "Doha", "Qatar", 25.26, 51.61],
  ["BAH", "Bahrain International", "Manama", "Bahrain", 26.27, 50.64],
  ["KWI", "Kuwait International", "Kuwait City", "Kuwait", 29.23, 47.97],
  ["MCT", "Muscat International", "Muscat", "Oman", 23.59, 58.28],
  ["RUH", "King Khalid International", "Riyadh", "Saudi Arabia", 24.96, 46.70],
  ["JED", "King Abdulaziz International", "Jeddah", "Saudi Arabia", 21.68, 39.16],
  ["DMM", "King Fahd International", "Dammam", "Saudi Arabia", 26.47, 49.80],
  ["AMM", "Queen Alia International", "Amman", "Jordan", 31.72, 35.99],
  ["BEY", "Rafic Hariri International", "Beirut", "Lebanon", 33.82, 35.49],
  ["TLV", "Ben Gurion", "Tel Aviv", "Israel", 32.01, 34.87],

  // ─── South Asia ───────────────────────────────────────
  ["DEL", "Indira Gandhi International", "Delhi", "India", 28.56, 77.10],
  ["BOM", "Chhatrapati Shivaji Maharaj", "Mumbai", "India", 19.09, 72.87],
  ["BLR", "Kempegowda International", "Bangalore", "India", 13.20, 77.71],
  ["MAA", "Chennai International", "Chennai", "India", 12.99, 80.17],
  ["CCU", "Netaji Subhas Chandra Bose", "Kolkata", "India", 22.65, 88.45],
  ["HYD", "Rajiv Gandhi International", "Hyderabad", "India", 17.24, 78.43],
  ["COK", "Cochin International", "Kochi", "India", 10.15, 76.40],
  ["GOI", "Dabolim", "Goa", "India", 15.38, 73.83],
  ["AMD", "Sardar Vallabhbhai Patel", "Ahmedabad", "India", 23.07, 72.63],
  ["PNQ", "Pune", "Pune", "India", 18.58, 73.92],
  ["JAI", "Jaipur International", "Jaipur", "India", 26.82, 75.81],
  ["LKO", "Chaudhary Charan Singh", "Lucknow", "India", 26.76, 80.88],
  ["GAU", "Lokpriya Gopinath Bordoloi", "Guwahati", "India", 26.11, 91.59],
  ["IXC", "Chandigarh International", "Chandigarh", "India", 30.67, 76.79],
  ["SXR", "Sheikh ul-Alam International", "Srinagar", "India", 33.99, 74.77],
  ["TRV", "Trivandrum International", "Thiruvananthapuram", "India", 8.48, 76.92],
  ["CMB", "Bandaranaike International", "Colombo", "Sri Lanka", 7.18, 79.88],
  ["KTM", "Tribhuvan International", "Kathmandu", "Nepal", 27.70, 85.36],
  ["DAC", "Hazrat Shahjalal International", "Dhaka", "Bangladesh", 23.84, 90.40],
  ["ISB", "Islamabad International", "Islamabad", "Pakistan", 33.56, 72.83],
  ["KHI", "Jinnah International", "Karachi", "Pakistan", 24.91, 67.16],
  ["LHE", "Allama Iqbal International", "Lahore", "Pakistan", 31.52, 74.40],
  ["MLE", "Velana International", "Malé", "Maldives", 4.19, 73.53],

  // ─── Southeast Asia ───────────────────────────────────
  ["SIN", "Changi", "Singapore", "Singapore", 1.36, 103.99],
  ["BKK", "Suvarnabhumi", "Bangkok", "Thailand", 13.69, 100.75],
  ["DMK", "Don Mueang", "Bangkok", "Thailand", 13.91, 100.61],
  ["HKT", "Phuket International", "Phuket", "Thailand", 8.11, 98.32],
  ["CNX", "Chiang Mai International", "Chiang Mai", "Thailand", 18.77, 98.96],
  ["KUL", "Kuala Lumpur International", "Kuala Lumpur", "Malaysia", 2.75, 101.71],
  ["PEN", "Penang International", "Penang", "Malaysia", 5.30, 100.28],
  ["BKI", "Kota Kinabalu International", "Kota Kinabalu", "Malaysia", 5.93, 116.05],
  ["KCH", "Kuching International", "Kuching", "Malaysia", 1.49, 110.35],
  ["CGK", "Soekarno-Hatta International", "Jakarta", "Indonesia", -6.13, 106.66],
  ["DPS", "Ngurah Rai", "Bali", "Indonesia", -8.75, 115.17],
  ["SUB", "Juanda International", "Surabaya", "Indonesia", -7.38, 112.79],
  ["UPG", "Sultan Hasanuddin", "Makassar", "Indonesia", -5.06, 119.55],
  ["MNL", "Ninoy Aquino International", "Manila", "Philippines", 14.51, 121.02],
  ["CEB", "Mactan-Cebu International", "Cebu", "Philippines", 10.31, 123.98],
  ["HAN", "Noi Bai International", "Hanoi", "Vietnam", 21.22, 105.81],
  ["SGN", "Tan Son Nhat International", "Ho Chi Minh City", "Vietnam", 10.82, 106.65],
  ["DAD", "Da Nang International", "Da Nang", "Vietnam", 16.04, 108.20],
  ["PNH", "Phnom Penh International", "Phnom Penh", "Cambodia", 11.55, 104.84],
  ["REP", "Siem Reap-Angkor International", "Siem Reap", "Cambodia", 13.41, 103.81],
  ["RGN", "Yangon International", "Yangon", "Myanmar", 16.91, 96.13],
  ["VTE", "Wattay International", "Vientiane", "Laos", 17.99, 102.56],

  // ─── East Asia ────────────────────────────────────────
  ["NRT", "Narita International", "Tokyo", "Japan", 35.76, 140.39],
  ["HND", "Haneda", "Tokyo", "Japan", 35.55, 139.78],
  ["KIX", "Kansai International", "Osaka", "Japan", 34.43, 135.24],
  ["ITM", "Osaka Itami", "Osaka", "Japan", 34.79, 135.44],
  ["CTS", "New Chitose", "Sapporo", "Japan", 42.77, 141.69],
  ["FUK", "Fukuoka", "Fukuoka", "Japan", 33.59, 130.45],
  ["NGO", "Chubu Centrair", "Nagoya", "Japan", 34.86, 136.81],
  ["OKA", "Naha", "Okinawa", "Japan", 26.20, 127.65],
  ["ICN", "Incheon International", "Seoul", "South Korea", 37.46, 126.44],
  ["GMP", "Gimpo International", "Seoul", "South Korea", 37.56, 126.79],
  ["PUS", "Gimhae International", "Busan", "South Korea", 35.18, 128.94],
  ["CJU", "Jeju International", "Jeju", "South Korea", 33.51, 126.49],
  ["HKG", "Hong Kong International", "Hong Kong", "China", 22.31, 113.91],
  ["TPE", "Taiwan Taoyuan", "Taipei", "Taiwan", 25.08, 121.23],
  ["KHH", "Kaohsiung International", "Kaohsiung", "Taiwan", 22.58, 120.35],
  ["PEK", "Beijing Capital International", "Beijing", "China", 40.08, 116.58],
  ["PKX", "Beijing Daxing International", "Beijing", "China", 39.51, 116.41],
  ["PVG", "Shanghai Pudong International", "Shanghai", "China", 31.14, 121.81],
  ["SHA", "Shanghai Hongqiao", "Shanghai", "China", 31.20, 121.34],
  ["CAN", "Guangzhou Baiyun", "Guangzhou", "China", 23.39, 113.30],
  ["SZX", "Shenzhen Bao'an", "Shenzhen", "China", 22.64, 113.81],
  ["CTU", "Chengdu Shuangliu", "Chengdu", "China", 30.57, 103.95],
  ["CKG", "Chongqing Jiangbei", "Chongqing", "China", 29.72, 106.64],
  ["WUH", "Wuhan Tianhe", "Wuhan", "China", 30.78, 114.21],
  ["XMN", "Xiamen Gaoqi", "Xiamen", "China", 24.54, 118.13],
  ["NKG", "Nanjing Lukou", "Nanjing", "China", 31.74, 118.86],
  ["HGH", "Hangzhou Xiaoshan", "Hangzhou", "China", 30.23, 120.43],
  ["KMG", "Kunming Changshui", "Kunming", "China", 24.99, 102.74],
  ["DLC", "Dalian Zhoushuizi", "Dalian", "China", 38.97, 121.54],
  ["TSN", "Tianjin Binhai", "Tianjin", "China", 39.12, 117.35],
  ["SHE", "Shenyang Taoxian", "Shenyang", "China", 41.64, 123.48],
  ["TAO", "Qingdao Jiaodong", "Qingdao", "China", 36.37, 120.09],
  ["URC", "Diwopu International", "Urumqi", "China", 43.91, 87.47],
  ["MFM", "Macau International", "Macau", "China", 22.15, 113.59],
  ["ULN", "Chinggis Khaan International", "Ulaanbaatar", "Mongolia", 47.84, 106.77],

  // ─── Oceania ──────────────────────────────────────────
  ["SYD", "Kingsford Smith", "Sydney", "Australia", -33.95, 151.18],
  ["MEL", "Melbourne Tullamarine", "Melbourne", "Australia", -37.67, 144.84],
  ["BNE", "Brisbane", "Brisbane", "Australia", -27.38, 153.12],
  ["PER", "Perth", "Perth", "Australia", -31.94, 115.97],
  ["ADL", "Adelaide", "Adelaide", "Australia", -34.94, 138.53],
  ["OOL", "Gold Coast", "Gold Coast", "Australia", -28.16, 153.51],
  ["CNS", "Cairns", "Cairns", "Australia", -16.89, 145.76],
  ["CBR", "Canberra", "Canberra", "Australia", -35.31, 149.19],
  ["HBA", "Hobart", "Hobart", "Australia", -42.84, 147.51],
  ["DRW", "Darwin", "Darwin", "Australia", -12.42, 130.87],
  ["AKL", "Auckland", "Auckland", "New Zealand", -37.01, 174.79],
  ["WLG", "Wellington", "Wellington", "New Zealand", -41.33, 174.81],
  ["CHC", "Christchurch", "Christchurch", "New Zealand", -43.49, 172.53],
  ["ZQN", "Queenstown", "Queenstown", "New Zealand", -45.02, 168.74],
  ["NAN", "Nadi International", "Nadi", "Fiji", -17.76, 177.44],
  ["PPT", "Faa'a International", "Papeete", "French Polynesia", -17.56, -149.61],
  ["NOU", "La Tontouta", "Noumea", "New Caledonia", -22.01, 166.22],

  // ─── Central America & Caribbean ──────────────────────
  ["MEX", "Benito Juárez International", "Mexico City", "Mexico", 19.44, -99.07],
  ["CUN", "Cancún International", "Cancún", "Mexico", 21.04, -86.87],
  ["GDL", "Miguel Hidalgo y Costilla", "Guadalajara", "Mexico", 20.52, -103.31],
  ["MTY", "Monterrey International", "Monterrey", "Mexico", 25.78, -100.11],
  ["SJO", "Juan Santamaría International", "San José", "Costa Rica", 9.99, -84.21],
  ["PTY", "Tocumen International", "Panama City", "Panama", 9.07, -79.38],
  ["SJU", "Luis Muñoz Marín International", "San Juan", "Puerto Rico", 18.44, -66.00],
  ["NAS", "Lynden Pindling International", "Nassau", "Bahamas", 25.04, -77.47],
  ["MBJ", "Sangster International", "Montego Bay", "Jamaica", 18.50, -77.91],
  ["KIN", "Norman Manley International", "Kingston", "Jamaica", 17.94, -76.79],
  ["PUJ", "Punta Cana International", "Punta Cana", "Dominican Republic", 18.57, -68.36],
  ["SDQ", "Las Américas International", "Santo Domingo", "Dominican Republic", 18.43, -69.67],
  ["HAV", "José Martí International", "Havana", "Cuba", 22.99, -82.41],
  ["SAL", "Monseñor Romero International", "San Salvador", "El Salvador", 13.44, -89.06],
  ["GUA", "La Aurora International", "Guatemala City", "Guatemala", 14.58, -90.53],
  ["BZE", "Philip Goldson International", "Belize City", "Belize", 17.54, -88.31],
  ["TGU", "Toncontín International", "Tegucigalpa", "Honduras", 14.06, -87.22],
  ["MGA", "Augusto C. Sandino International", "Managua", "Nicaragua", 12.14, -86.17],
  ["AUA", "Queen Beatrix International", "Oranjestad", "Aruba", 12.50, -70.02],
  ["CUR", "Hato International", "Willemstad", "Curaçao", 12.19, -68.96],
  ["POS", "Piarco International", "Port of Spain", "Trinidad and Tobago", 10.60, -61.34],
  ["BGI", "Grantley Adams International", "Bridgetown", "Barbados", 13.07, -59.49],
  ["SXM", "Princess Juliana International", "Philipsburg", "Sint Maarten", 18.04, -63.11],

  // ─── South America ────────────────────────────────────
  ["GRU", "Guarulhos", "São Paulo", "Brazil", -23.43, -46.47],
  ["GIG", "Galeão", "Rio de Janeiro", "Brazil", -22.81, -43.25],
  ["BSB", "Brasília International", "Brasília", "Brazil", -15.87, -47.92],
  ["CNF", "Tancredo Neves International", "Belo Horizonte", "Brazil", -19.63, -43.97],
  ["SSA", "Deputado Luís Eduardo Magalhães", "Salvador", "Brazil", -12.91, -38.33],
  ["REC", "Guararapes", "Recife", "Brazil", -8.13, -34.92],
  ["FOR", "Pinto Martins", "Fortaleza", "Brazil", -3.78, -38.53],
  ["CWB", "Afonso Pena International", "Curitiba", "Brazil", -25.53, -49.17],
  ["POA", "Salgado Filho International", "Porto Alegre", "Brazil", -29.99, -51.17],
  ["MAO", "Eduardo Gomes International", "Manaus", "Brazil", -3.04, -60.05],
  ["EZE", "Ministro Pistarini", "Buenos Aires", "Argentina", -34.82, -58.54],
  ["AEP", "Jorge Newbery", "Buenos Aires", "Argentina", -34.56, -58.42],
  ["SCL", "Arturo Merino Benítez", "Santiago", "Chile", -33.39, -70.79],
  ["LIM", "Jorge Chávez International", "Lima", "Peru", -12.02, -77.11],
  ["BOG", "El Dorado International", "Bogotá", "Colombia", 4.70, -74.15],
  ["MDE", "José María Córdova International", "Medellín", "Colombia", 6.16, -75.42],
  ["CTG", "Rafael Núñez International", "Cartagena", "Colombia", 10.44, -75.51],
  ["UIO", "Mariscal Sucre International", "Quito", "Ecuador", -0.13, -78.36],
  ["GYE", "José Joaquín de Olmedo International", "Guayaquil", "Ecuador", -2.16, -79.88],
  ["CCS", "Simón Bolívar International", "Caracas", "Venezuela", 10.60, -66.99],
  ["MVD", "Carrasco International", "Montevideo", "Uruguay", -34.84, -56.03],
  ["ASU", "Silvio Pettirossi International", "Asunción", "Paraguay", -25.24, -57.52],
  ["VVI", "Viru Viru International", "Santa Cruz", "Bolivia", -17.64, -63.14],
  ["LPB", "El Alto International", "La Paz", "Bolivia", -16.51, -68.19],

  // ─── Africa ───────────────────────────────────────────
  ["JNB", "O.R. Tambo International", "Johannesburg", "South Africa", -26.14, 28.25],
  ["CPT", "Cape Town International", "Cape Town", "South Africa", -33.97, 18.60],
  ["DUR", "King Shaka International", "Durban", "South Africa", -29.61, 31.12],
  ["CAI", "Cairo International", "Cairo", "Egypt", 30.12, 31.41],
  ["HRG", "Hurghada International", "Hurghada", "Egypt", 27.18, 33.80],
  ["SSH", "Sharm el-Sheikh International", "Sharm el-Sheikh", "Egypt", 27.98, 34.39],
  ["LXR", "Luxor International", "Luxor", "Egypt", 25.67, 32.71],
  ["CMN", "Mohammed V International", "Casablanca", "Morocco", 33.37, -7.59],
  ["RAK", "Marrakech Menara", "Marrakech", "Morocco", 31.61, -8.04],
  ["TNG", "Ibn Battouta", "Tangier", "Morocco", 35.73, -5.92],
  ["FEZ", "Saïss", "Fez", "Morocco", 33.93, -4.98],
  ["ALG", "Houari Boumediene", "Algiers", "Algeria", 36.69, 3.22],
  ["TUN", "Tunis-Carthage International", "Tunis", "Tunisia", 36.85, 10.23],
  ["NBO", "Jomo Kenyatta International", "Nairobi", "Kenya", -1.32, 36.93],
  ["MBA", "Moi International", "Mombasa", "Kenya", -4.03, 39.59],
  ["DAR", "Julius Nyerere International", "Dar es Salaam", "Tanzania", -6.88, 39.20],
  ["JRO", "Kilimanjaro International", "Kilimanjaro", "Tanzania", -3.43, 37.07],
  ["ZNZ", "Abeid Amani Karume", "Zanzibar", "Tanzania", -6.22, 39.22],
  ["EBB", "Entebbe International", "Entebbe", "Uganda", 0.04, 32.44],
  ["ADD", "Addis Ababa Bole International", "Addis Ababa", "Ethiopia", 8.98, 38.80],
  ["LOS", "Murtala Muhammed International", "Lagos", "Nigeria", 6.58, 3.32],
  ["ABV", "Nnamdi Azikiwe International", "Abuja", "Nigeria", 9.01, 7.26],
  ["ACC", "Kotoka International", "Accra", "Ghana", 5.61, -0.17],
  ["DSS", "Blaise Diagne International", "Dakar", "Senegal", 14.67, -17.07],
  ["ABJ", "Félix-Houphouët-Boigny International", "Abidjan", "Ivory Coast", 5.26, -3.93],
  ["MRU", "Sir Seewoosagur Ramgoolam International", "Port Louis", "Mauritius", -20.43, 57.68],
  ["SEZ", "Seychelles International", "Mahé", "Seychelles", -4.67, 55.52],
  ["TNR", "Ivato International", "Antananarivo", "Madagascar", -18.80, 47.48],
  ["WDH", "Hosea Kutako International", "Windhoek", "Namibia", -22.48, 17.47],
  ["GBE", "Sir Seretse Khama International", "Gaborone", "Botswana", -24.55, 25.92],
  ["HRE", "Robert Gabriel Mugabe International", "Harare", "Zimbabwe", -17.93, 31.09],
  ["VFA", "Victoria Falls", "Victoria Falls", "Zimbabwe", -18.10, 25.84],
  ["LUN", "Kenneth Kaunda International", "Lusaka", "Zambia", -15.33, 28.45],
  ["MPM", "Maputo International", "Maputo", "Mozambique", -25.92, 32.57],

  // ─── Central Asia & Caucasus ──────────────────────────
  ["TAS", "Islam Karimov Tashkent", "Tashkent", "Uzbekistan", 41.26, 69.28],
  ["ALA", "Almaty International", "Almaty", "Kazakhstan", 43.35, 77.04],
  ["NQZ", "Nursultan Nazarbayev", "Astana", "Kazakhstan", 51.02, 71.47],
  ["GYD", "Heydar Aliyev International", "Baku", "Azerbaijan", 40.47, 50.05],
  ["TBS", "Shota Rustaveli Tbilisi", "Tbilisi", "Georgia", 41.67, 44.95],
  ["EVN", "Zvartnots International", "Yerevan", "Armenia", 40.15, 44.40],
  ["IKA", "Imam Khomeini International", "Tehran", "Iran", 35.42, 51.15],
];

// ── Build typed data structures from compact representation ──

export const AIRPORTS: Airport[] = RAW.map(([iata, name, city, country]) => ({
  iata,
  name,
  city,
  country,
}));

const COORDS: Record<string, [number, number]> = {};
for (const [iata, , , , lat, lon] of RAW) {
  COORDS[iata] = [lat, lon];
}

export function searchAirports(query: string): Airport[] {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  // Exact IATA match first
  const exactIata = AIRPORTS.filter((a) => a.iata.toLowerCase() === q);
  const rest = AIRPORTS.filter(
    (a) =>
      a.iata.toLowerCase() !== q &&
      (a.iata.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q))
  );

  return [...exactIata, ...rest].slice(0, 10);
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function estimateFlightDuration(from: string, to: string): number {
  const c1 = COORDS[from];
  const c2 = COORDS[to];
  if (!c1 || !c2) return 180; // default 3h
  const distKm = haversineDistance(c1[0], c1[1], c2[0], c2[1]);
  // Average cruising speed ~850 km/h, add 30 min for taxi/takeoff/landing
  return Math.round((distKm / 850) * 60 + 30);
}

export function findAirport(iata: string): Airport | null {
  const code = iata.toUpperCase();
  return AIRPORTS.find((a) => a.iata === code) ?? null;
}

export function findAirportByCity(city: string): Airport | null {
  const q = city.toLowerCase().trim();
  return AIRPORTS.find((a) => a.city.toLowerCase() === q) ?? null;
}
