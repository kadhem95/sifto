// Lista di città italiane con province
export const italianCities = [
  { name: "Roma", province: "RM", country: "Italia" },
  { name: "Milano", province: "MI", country: "Italia" },
  { name: "Napoli", province: "NA", country: "Italia" },
  { name: "Torino", province: "TO", country: "Italia" },
  { name: "Palermo", province: "PA", country: "Italia" },
  { name: "Genova", province: "GE", country: "Italia" },
  { name: "Bologna", province: "BO", country: "Italia" },
  { name: "Firenze", province: "FI", country: "Italia" },
  { name: "Bari", province: "BA", country: "Italia" },
  { name: "Catania", province: "CT", country: "Italia" },
  { name: "Venezia", province: "VE", country: "Italia" },
  { name: "Verona", province: "VR", country: "Italia" },
  { name: "Messina", province: "ME", country: "Italia" },
  { name: "Padova", province: "PD", country: "Italia" },
  { name: "Trieste", province: "TS", country: "Italia" },
  { name: "Taranto", province: "TA", country: "Italia" },
  { name: "Brescia", province: "BS", country: "Italia" },
  { name: "Parma", province: "PR", country: "Italia" },
  { name: "Reggio Calabria", province: "RC", country: "Italia" },
  { name: "Modena", province: "MO", country: "Italia" },
  { name: "Reggio Emilia", province: "RE", country: "Italia" },
  { name: "Prato", province: "PO", country: "Italia" },
  { name: "Cagliari", province: "CA", country: "Italia" },
  { name: "Livorno", province: "LI", country: "Italia" },
  { name: "Foggia", province: "FG", country: "Italia" },
  { name: "Perugia", province: "PG", country: "Italia" },
  { name: "Salerno", province: "SA", country: "Italia" },
  { name: "Ravenna", province: "RA", country: "Italia" },
  { name: "Ferrara", province: "FE", country: "Italia" },
  { name: "Rimini", province: "RN", country: "Italia" },
  { name: "Siracusa", province: "SR", country: "Italia" },
  { name: "Pescara", province: "PE", country: "Italia" },
  { name: "Monza", province: "MB", country: "Italia" },
  { name: "Ancona", province: "AN", country: "Italia" },
  { name: "Bergamo", province: "BG", country: "Italia" },
  { name: "Vicenza", province: "VI", country: "Italia" },
  { name: "Bolzano", province: "BZ", country: "Italia" },
  { name: "Trento", province: "TN", country: "Italia" },
  { name: "Novara", province: "NO", country: "Italia" },
  { name: "Piacenza", province: "PC", country: "Italia" }
];

// Lista di città del Nord Africa
export const northAfricanCities = [
  { name: "Tunisi", country: "Tunisia" },
  { name: "Sfax", country: "Tunisia" },
  { name: "Sousse", country: "Tunisia" },
  { name: "Gabes", country: "Tunisia" },
  { name: "Bizerte", country: "Tunisia" },
  { name: "Gafsa", country: "Tunisia" },
  { name: "Kairouan", country: "Tunisia" },
  { name: "Rabat", country: "Marocco" },
  { name: "Casablanca", country: "Marocco" },
  { name: "Fès", country: "Marocco" },
  { name: "Marrakech", country: "Marocco" },
  { name: "Tangeri", country: "Marocco" },
  { name: "Agadir", country: "Marocco" },
  { name: "Salé", country: "Marocco" },
  { name: "Algeri", country: "Algeria" },
  { name: "Orano", country: "Algeria" },
  { name: "Costantina", country: "Algeria" },
  { name: "Annaba", country: "Algeria" },
  { name: "Tripoli", country: "Libia" },
  { name: "Bengasi", country: "Libia" },
  { name: "Il Cairo", country: "Egitto" },
  { name: "Alessandria", country: "Egitto" },
  { name: "Suez", country: "Egitto" }
];

// Combina le liste per una ricerca globale
export const allCities = [...italianCities, ...northAfricanCities];

// Funzione helper per formattare la visualizzazione delle città
export const formatCityDisplay = (city: { name: string; province?: string; country: string }) => {
  if (city.province) {
    return `${city.name} (${city.province})`;
  }
  return `${city.name}, ${city.country}`;
};