import { searchAirports, estimateFlightDuration, findAirport, findAirportByCity } from '../../src/services/airports';

describe('airports', () => {
  describe('searchAirports', () => {
    it('finds airports by IATA code', () => {
      const results = searchAirports('JFK');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].iata).toBe('JFK');
    });

    it('finds airports by city name', () => {
      const results = searchAirports('Tokyo');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((a) => a.city === 'Tokyo')).toBe(true);
    });

    it('finds airports by country name', () => {
      const results = searchAirports('Japan');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((a) => a.country === 'Japan')).toBe(true);
    });

    it('returns empty array for no match', () => {
      const results = searchAirports('xyznonexistent');
      expect(results).toHaveLength(0);
    });

    it('returns empty for single character query', () => {
      expect(searchAirports('J')).toHaveLength(0);
    });

    it('is case-insensitive', () => {
      const upper = searchAirports('LHR');
      const lower = searchAirports('lhr');
      expect(upper.length).toBe(lower.length);
      expect(upper[0].iata).toBe(lower[0].iata);
    });

    it('limits results to 10', () => {
      const results = searchAirports('International');
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('returns exact IATA match first', () => {
      const results = searchAirports('LAX');
      expect(results[0].iata).toBe('LAX');
    });
  });

  describe('estimateFlightDuration', () => {
    it('estimates duration between two airports', () => {
      const duration = estimateFlightDuration('JFK', 'LAX');
      // JFK to LAX is roughly 5-6 hours = 300-360 min
      expect(duration).toBeGreaterThan(200);
      expect(duration).toBeLessThan(400);
    });

    it('returns 30 for same airport (distance 0 + 30 min overhead)', () => {
      const duration = estimateFlightDuration('JFK', 'JFK');
      expect(duration).toBe(30);
    });

    it('returns default 180 for unknown airports', () => {
      expect(estimateFlightDuration('XXX', 'YYY')).toBe(180);
    });

    it('produces longer durations for intercontinental flights', () => {
      const domestic = estimateFlightDuration('JFK', 'LAX');
      const intercontinental = estimateFlightDuration('JFK', 'NRT');
      expect(intercontinental).toBeGreaterThan(domestic);
    });
  });

  describe('findAirport', () => {
    it('finds airport by IATA code', () => {
      const airport = findAirport('JFK');
      expect(airport).not.toBeNull();
      expect(airport!.city).toBe('New York');
    });

    it('returns null for unknown code', () => {
      expect(findAirport('ZZZ')).toBeNull();
    });

    it('is case-insensitive', () => {
      expect(findAirport('jfk')).not.toBeNull();
    });
  });

  describe('findAirportByCity', () => {
    it('finds airport by city name', () => {
      const airport = findAirportByCity('London');
      expect(airport).not.toBeNull();
    });

    it('returns null for unknown city', () => {
      expect(findAirportByCity('Atlantis')).toBeNull();
    });
  });
});
