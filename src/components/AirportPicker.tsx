import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Airport } from '../lib/types';
import { searchAirports } from '../services/airports';
import { Colors } from '../theme/colors';

interface AirportPickerProps {
  label: string;
  icon: 'departure' | 'arrival';
  value: Airport | null;
  onChange: (airport: Airport) => void;
}

export default function AirportPicker({ label, icon, value, onChange }: AirportPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Airport[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const found = searchAirports(text);
      setResults(found);
      setOpen(found.length > 0);
    }, 150);
  }, []);

  const handleSelect = useCallback(
    (airport: Airport) => {
      onChange(airport);
      setQuery('');
      setResults([]);
      setOpen(false);
      Keyboard.dismiss();
    },
    [onChange]
  );

  const clear = useCallback(() => {
    onChange(null as unknown as Airport);
    setQuery('');
    setResults([]);
  }, [onChange]);

  const iconEmoji = icon === 'departure' ? '🛫' : '🛬';

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      {value ? (
        <View style={styles.selectedRow}>
          <Text style={styles.iconEmoji}>{iconEmoji}</Text>
          <Text style={styles.iataCode}>{value.iata}</Text>
          <Text style={styles.dash}>—</Text>
          <Text style={styles.cityName} numberOfLines={1}>
            {value.city}, {value.country}
          </Text>
          <TouchableOpacity onPress={clear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <View style={styles.inputIconContainer}>
            <Text style={styles.iconEmoji}>{iconEmoji}</Text>
          </View>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleSearch}
            placeholder="Search city, airport, or code…"
            placeholderTextColor={Colors.slate[500]}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
        </View>
      )}

      {/* Results list — inline, pushes content down */}
      {open && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.iata}
              style={styles.dropdownItem}
              onPress={() => handleSelect(item)}
              activeOpacity={0.6}
            >
              <View style={styles.iataBadge}>
                <Text style={styles.iataBadgeText}>{item.iata}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.airportName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.airportCity}>{item.city}, {item.country}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.slate[400],
    marginBottom: 6,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  iconEmoji: {
    fontSize: 16,
  },
  iataCode: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.sky[400],
  },
  dash: {
    color: Colors.slate[500],
    fontSize: 14,
  },
  cityName: {
    flex: 1,
    fontSize: 14,
    color: Colors.slate[300],
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearBtnText: {
    fontSize: 13,
    color: Colors.slate[500],
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIconContainer: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.5)',
    borderRadius: 12,
    paddingLeft: 40,
    paddingRight: 12,
    paddingVertical: 10,
    color: Colors.slate[200],
    fontSize: 14,
  },
  dropdown: {
    backgroundColor: Colors.bgCardSolid,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.3)',
  },
  iataBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  iataBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.sky[400],
  },
  airportName: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.slate[200],
  },
  airportCity: {
    fontSize: 11,
    color: Colors.slate[500],
    marginTop: 1,
  },
});
