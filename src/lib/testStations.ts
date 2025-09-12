import { TestStation } from "@/types";

export const TEST_STATIONS: TestStation[] = [
  {
    id: "ffmi-station",
    name: "FFMI & Boy-Kilo",
    type: "ffmi",
    description: "Vücut kompozisyonu ve boy-kilo ölçümü",
    required_coaches: 1,
    unit: "kg/cm",
    icon: "📏",
  },
  {
    id: "sprint-30m-station",
    name: "30m Fotosel",
    type: "sprint_30m",
    description: "30 metre sprint testi (2 koşu)",
    required_coaches: 2,
    unit: "saniye",
    icon: "🏃‍♂️",
  },
  {
    id: "agility-station",
    name: "Çeviklik Drilli",
    type: "agility",
    description: "Çeviklik ve koordinasyon testi",
    required_coaches: 1,
    unit: "saniye",
    icon: "🔄",
  },
  {
    id: "vertical-jump-station",
    name: "Dikey Sıçrama",
    type: "vertical_jump",
    description: "Dikey sıçrama yüksekliği testi",
    required_coaches: 1,
    unit: "cm",
    icon: "⬆️",
  },
  {
    id: "flexibility-station",
    name: "Esneklik Boxı",
    type: "flexibility",
    description: "Esneklik ve hareketlilik testi",
    required_coaches: 1,
    unit: "cm",
    icon: "🤸‍♂️",
  },
];

export const getStationByType = (type: string): TestStation | undefined => {
  return TEST_STATIONS.find((station) => station.type === type);
};

export const getStationById = (id: string): TestStation | undefined => {
  return TEST_STATIONS.find((station) => station.id === id);
};
