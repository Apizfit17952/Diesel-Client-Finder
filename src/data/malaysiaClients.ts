export interface DieselClient {
  id: string;
  companyName: string;
  industry: string;
  region: string;
  state: string;
  city: string;
  estimatedUsage: number; // liters per month
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  lastUpdated: string;
  status: 'active' | 'potential' | 'new';
  priority: 'high' | 'medium' | 'low';
  coordinates: { lat: number; lng: number };
}

export const malaysiaStates = {
  pantaiTimur: ['Kelantan', 'Terengganu', 'Pahang'],
  pantaiBarat: ['Perlis', 'Kedah', 'Pulau Pinang', 'Perak', 'Selangor', 'Negeri Sembilan', 'Melaka', 'Johor'],
  borneo: ['Sabah', 'Sarawak'],
  federal: ['Kuala Lumpur', 'Putrajaya', 'Labuan'],
};

export const industries = [
  'Plantation & Agriculture',
  'Construction',
  'Mining & Quarry',
  'Transportation & Logistics',
  'Manufacturing',
  'Fishery & Marine',
  'Power Generation',
  'Oil & Gas',
  'Hospitality',
  'Government & Municipal',
];

// Sample clients data - focusing on Pantai Timur
export const sampleClients: DieselClient[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567001',
    companyName: 'Ladang Kelapa Sawit Kota Bharu',
    industry: 'Plantation & Agriculture',
    region: 'Pantai Timur',
    state: 'Kelantan',
    city: 'Kota Bharu',
    estimatedUsage: 25000,
    contactPerson: 'Ahmad Razak',
    contactPhone: '+60 19-888-1234',
    contactEmail: 'ahmad@lkskb.com.my',
    lastUpdated: '2026-01-12',
    status: 'active',
    priority: 'high',
    coordinates: { lat: 6.1254, lng: 102.2381 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567002',
    companyName: 'Pembinaan Mega Terengganu Sdn Bhd',
    industry: 'Construction',
    region: 'Pantai Timur',
    state: 'Terengganu',
    city: 'Kuala Terengganu',
    estimatedUsage: 18500,
    contactPerson: 'Mohd Hafiz',
    contactPhone: '+60 17-555-9876',
    contactEmail: 'hafiz@pmtsb.com.my',
    lastUpdated: '2026-01-11',
    status: 'potential',
    priority: 'high',
    coordinates: { lat: 5.3117, lng: 103.1324 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567003',
    companyName: 'Kuari Bukit Pahang',
    industry: 'Mining & Quarry',
    region: 'Pantai Timur',
    state: 'Pahang',
    city: 'Kuantan',
    estimatedUsage: 32000,
    contactPerson: 'Lee Wei Ming',
    contactPhone: '+60 12-333-4567',
    contactEmail: 'weiming@kbp.com.my',
    lastUpdated: '2026-01-12',
    status: 'active',
    priority: 'high',
    coordinates: { lat: 3.8077, lng: 103.326 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567004',
    companyName: 'Syarikat Pengangkutan Timur',
    industry: 'Transportation & Logistics',
    region: 'Pantai Timur',
    state: 'Kelantan',
    city: 'Tanah Merah',
    estimatedUsage: 45000,
    contactPerson: 'Ismail bin Hassan',
    contactPhone: '+60 19-777-2345',
    contactEmail: 'ismail@spt.com.my',
    lastUpdated: '2026-01-10',
    status: 'active',
    priority: 'high',
    coordinates: { lat: 5.8087, lng: 102.1486 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567005',
    companyName: 'Kilang Perabot Dungun',
    industry: 'Manufacturing',
    region: 'Pantai Timur',
    state: 'Terengganu',
    city: 'Dungun',
    estimatedUsage: 8500,
    contactPerson: 'Tan Beng Huat',
    contactPhone: '+60 13-444-8765',
    contactEmail: 'bh.tan@kpd.com.my',
    lastUpdated: '2026-01-09',
    status: 'potential',
    priority: 'medium',
    coordinates: { lat: 4.7627, lng: 103.4205 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567006',
    companyName: 'Persatuan Nelayan Kuala Besut',
    industry: 'Fishery & Marine',
    region: 'Pantai Timur',
    state: 'Terengganu',
    city: 'Besut',
    estimatedUsage: 15000,
    contactPerson: 'Zainal Abidin',
    contactPhone: '+60 16-222-3456',
    contactEmail: 'zainal@pnkb.org.my',
    lastUpdated: '2026-01-12',
    status: 'active',
    priority: 'high',
    coordinates: { lat: 5.8327, lng: 102.5516 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567007',
    companyName: 'Janakuasa Pahang Timur',
    industry: 'Power Generation',
    region: 'Pantai Timur',
    state: 'Pahang',
    city: 'Pekan',
    estimatedUsage: 65000,
    contactPerson: 'Dr. Siti Aminah',
    contactPhone: '+60 14-111-7890',
    contactEmail: 'siti@jpt.com.my',
    lastUpdated: '2026-01-11',
    status: 'active',
    priority: 'high',
    coordinates: { lat: 3.4848, lng: 103.3936 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567008',
    companyName: 'Hotel Pantai Timur Resort',
    industry: 'Hospitality',
    region: 'Pantai Timur',
    state: 'Terengganu',
    city: 'Marang',
    estimatedUsage: 7200,
    contactPerson: 'Faridah Yusof',
    contactPhone: '+60 17-888-4321',
    contactEmail: 'faridah@hptr.com.my',
    lastUpdated: '2026-01-08',
    status: 'potential',
    priority: 'medium',
    coordinates: { lat: 5.2063, lng: 103.2084 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567009',
    companyName: 'Majlis Perbandaran Machang',
    industry: 'Government & Municipal',
    region: 'Pantai Timur',
    state: 'Kelantan',
    city: 'Machang',
    estimatedUsage: 12000,
    contactPerson: 'Encik Ramli',
    contactPhone: '+60 19-666-5432',
    contactEmail: 'ramli@mpm.gov.my',
    lastUpdated: '2026-01-12',
    status: 'active',
    priority: 'medium',
    coordinates: { lat: 5.7667, lng: 102.2167 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567010',
    companyName: 'Petronas Contractor Services',
    industry: 'Oil & Gas',
    region: 'Pantai Timur',
    state: 'Terengganu',
    city: 'Kerteh',
    estimatedUsage: 85000,
    contactPerson: 'Encik Azman Shah',
    contactPhone: '+60 12-999-8765',
    contactEmail: 'azman@pcs.com.my',
    lastUpdated: '2026-01-12',
    status: 'active',
    priority: 'high',
    coordinates: { lat: 4.5167, lng: 103.4333 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567011',
    companyName: 'Ladang Getah Gua Musang',
    industry: 'Plantation & Agriculture',
    region: 'Pantai Timur',
    state: 'Kelantan',
    city: 'Gua Musang',
    estimatedUsage: 18000,
    contactPerson: 'Encik Mustafa',
    contactPhone: '+60 19-321-6543',
    contactEmail: 'mustafa@lggm.com.my',
    lastUpdated: '2026-01-10',
    status: 'new',
    priority: 'high',
    coordinates: { lat: 4.8833, lng: 101.9667 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567012',
    companyName: 'Pembinaan Jalan Raya Pahang',
    industry: 'Construction',
    region: 'Pantai Timur',
    state: 'Pahang',
    city: 'Temerloh',
    estimatedUsage: 22000,
    contactPerson: 'Encik Kamal',
    contactPhone: '+60 13-654-9871',
    contactEmail: 'kamal@pjrp.com.my',
    lastUpdated: '2026-01-11',
    status: 'new',
    priority: 'high',
    coordinates: { lat: 3.4500, lng: 102.4167 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567013',
    companyName: 'Kilang Sawit Kemaman',
    industry: 'Plantation & Agriculture',
    region: 'Pantai Timur',
    state: 'Terengganu',
    city: 'Kemaman',
    estimatedUsage: 28000,
    contactPerson: 'Puan Noraini',
    contactPhone: '+60 17-123-4567',
    contactEmail: 'noraini@ksk.com.my',
    lastUpdated: '2026-01-12',
    status: 'active',
    priority: 'high',
    coordinates: { lat: 4.2333, lng: 103.4167 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567014',
    companyName: 'Syarikat Bas Ekspres Timur',
    industry: 'Transportation & Logistics',
    region: 'Pantai Timur',
    state: 'Pahang',
    city: 'Jerantut',
    estimatedUsage: 35000,
    contactPerson: 'Encik Roslan',
    contactPhone: '+60 14-987-6543',
    contactEmail: 'roslan@sbet.com.my',
    lastUpdated: '2026-01-09',
    status: 'potential',
    priority: 'high',
    coordinates: { lat: 3.9333, lng: 102.3667 },
  },
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567015',
    companyName: 'Nelayan Setiu Cooperative',
    industry: 'Fishery & Marine',
    region: 'Pantai Timur',
    state: 'Terengganu',
    city: 'Setiu',
    estimatedUsage: 9500,
    contactPerson: 'Encik Hamid',
    contactPhone: '+60 16-789-0123',
    contactEmail: 'hamid@nsc.org.my',
    lastUpdated: '2026-01-11',
    status: 'new',
    priority: 'medium',
    coordinates: { lat: 5.5333, lng: 102.7167 },
  },
];

export const MIN_ORDER_LITERS = 5460;

export function getQualifiedClients(clients: DieselClient[]): DieselClient[] {
  return clients.filter(client => client.estimatedUsage >= MIN_ORDER_LITERS);
}

export function getClientsByRegion(clients: DieselClient[], region: string): DieselClient[] {
  return clients.filter(client => client.region === region);
}

export function getClientsByState(clients: DieselClient[], state: string): DieselClient[] {
  return clients.filter(client => client.state === state);
}

export function getNewLeads(clients: DieselClient[]): DieselClient[] {
  return clients.filter(client => client.status === 'new');
}

export function getHighPriorityClients(clients: DieselClient[]): DieselClient[] {
  return clients.filter(client => client.priority === 'high');
}
