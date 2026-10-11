// Mock user data
const userData = {
  id: "user-1",
  name: "Marco",
  surname: "Rossi",
  email: "marco.rossi@bitrock.it",
  role: "developer",
  avatar: "/placeholder.svg",
  active: true,
  phone: "+39 123 456 7890",
  projects: ["project-1", "project-2", "project-3"],
};

// Mock users data
const users = [
  userData,
  {
    id: "user-2",
    name: "Laura",
    surname: "Bianchi",
    email: "laura.bianchi@bitrock.it",
    role: "designer",
    avatar: "/placeholder.svg",
    active: true,
    phone: "+39 234 567 8901",
    projects: ["project-1", "project-4"],
  },
  {
    id: "user-3",
    name: "Giovanni",
    surname: "Verdi",
    email: "giovanni.verdi@bitrock.it",
    role: "manager",
    avatar: "/placeholder.svg",
    active: true,
    phone: "+39 345 678 9012",
    projects: ["project-1", "project-2", "project-3", "project-4", "project-5"],
  },
  {
    id: "user-4",
    name: "Francesca",
    surname: "Neri",
    email: "francesca.neri@bitrock.it",
    role: "admin",
    avatar: "/placeholder.svg",
    active: true,
    phone: "+39 456 789 0123",
    projects: [],
  },
  {
    id: "user-5",
    name: "Alessandro",
    surname: "Gialli",
    email: "alessandro.gialli@bitrock.it",
    role: "developer",
    avatar: "/placeholder.svg",
    active: false,
    phone: "+39 567 890 1234",
    projects: ["project-2", "project-5"],
  },
];

type ClientStatus = "active" | "inactive";

export interface Client {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: string;
  vatNumber: string;
  contactPerson: string;
  status: ClientStatus;
  createdAt: string; // ISO date string
  notes: string;
}

export const clientsData: Client[] = [
  {
    id: "client-1",
    name: "Acme Corporation",
    code: "ACME",
    email: "contact@acme.com",
    phone: "+39 02 1234 5678",
    address: "Via Milano 123, 20100 Milano",
    vatNumber: "IT12345678901",
    contactPerson: "Mario Rossi",
    status: "active",
    createdAt: "2023-01-15",
    notes: "Cliente principale per progetti enterprise",
  },
  {
    id: "client-2",
    name: "TechStart SRL",
    code: "TECH",
    email: "info@techstart.it",
    phone: "+39 06 9876 5432",
    address: "Via Roma 456, 00100 Roma",
    vatNumber: "IT98765432109",
    contactPerson: "Laura Bianchi",
    status: "active",
    createdAt: "2023-03-10",
    notes: "Startup tecnologica in crescita",
  },
  {
    id: "client-3",
    name: "Global Industries",
    code: "GLOB",
    email: "projects@global.com",
    phone: "+39 011 5555 7777",
    address: "Corso Torino 789, 10100 Torino",
    vatNumber: "IT11223344556",
    contactPerson: "Giuseppe Verdi",
    status: "active",
    createdAt: "2022-11-01",
    notes: "Multinazionale con progetti complessi",
  },
  {
    id: "client-4",
    name: "Local Business",
    code: "LOCAL",
    email: "admin@localbiz.it",
    phone: "+39 051 3333 4444",
    address: "Via Bologna 321, 40100 Bologna",
    vatNumber: "IT66778899001",
    contactPerson: "Anna Neri",
    status: "inactive",
    createdAt: "2023-06-01",
    notes: "Cliente locale con progetti stagionali",
  },
];

// Mock contract data
const contractsData = [
  {
    employeeId: "user-1",
    ral: 45000,
    contractType: "permanent",
    startDate: "2023-01-15",
    endDate: null,
    workingHours: "full-time",
    remotePolicy: "hybrid",
    notes: "Contratto standard con possibilità di smart working 3 giorni a settimana.",
    status: "active",
    contractVisibleToEmployee: true,
    lastModified: "2024-01-15T10:30:00Z",
    modifiedBy: "user-3",
  },
  {
    employeeId: "user-2",
    ral: 38000,
    contractType: "permanent",
    startDate: "2022-09-01",
    endDate: null,
    workingHours: "full-time",
    remotePolicy: "full-remote",
    notes: "Designer senior con esperienza in UX/UI. Lavoro completamente remoto.",
    status: "active",
    contractVisibleToEmployee: true,
    lastModified: "2023-12-01T14:20:00Z",
    modifiedBy: "user-3",
  },
  {
    employeeId: "user-3",
    ral: 65000,
    contractType: "permanent",
    startDate: "2021-03-10",
    endDate: null,
    workingHours: "full-time",
    remotePolicy: "hybrid",
    notes: "Team Manager con responsabilità su 8 persone. Bonus annuale variabile.",
    status: "active",
    contractVisibleToEmployee: false,
    lastModified: "2024-01-01T09:00:00Z",
    modifiedBy: "user-4",
  },
  {
    employeeId: "user-4",
    ral: 75000,
    contractType: "permanent",
    startDate: "2020-06-01",
    endDate: null,
    workingHours: "full-time",
    remotePolicy: "on-site",
    notes: "HR Manager con accesso completo ai sistemi aziendali.",
    status: "active",
    contractVisibleToEmployee: false,
    lastModified: "2023-11-15T16:45:00Z",
    modifiedBy: "user-4",
  },
  {
    employeeId: "user-5",
    ral: 42000,
    contractType: "fixed-term",
    startDate: "2023-06-01",
    endDate: "2024-05-31",
    workingHours: "full-time",
    remotePolicy: "hybrid",
    notes: "Contratto a tempo determinato per progetto specifico. Possibile rinnovo.",
    status: "not-active",
    contractVisibleToEmployee: true,
    lastModified: "2024-01-10T11:15:00Z",
    modifiedBy: "user-3",
  },
];

// Mock user summary data
const userSummary = {
  hoursWorked: 120,
  vacationDaysLeft: 15,
  vacationDaysTotal: 25,
  activeProjects: 3,
  totalProjects: 5,
  pendingRequests: 2,
};

// Mock hours data
const hoursData = {
  weekly: [
    { label: "Lun", hours: 8 },
    { label: "Mar", hours: 7.5 },
    { label: "Mer", hours: 8 },
    { label: "Gio", hours: 6 },
    { label: "Ven", hours: 8 },
  ],
  monthly: [
    { label: "Sett 1", hours: 38 },
    { label: "Sett 2", hours: 40 },
    { label: "Sett 3", hours: 35 },
    { label: "Sett 4", hours: 42 },
  ],
};

// Mock notifications
const notifications = [
  {
    title: "Richiesta ferie in attesa",
    description: "La tua richiesta ferie dal 15/08 al 22/08 è in attesa di approvazione",
    requiresAction: false,
  },
  {
    title: "Approvazione richiesta",
    description: "Devi approvare la richiesta di permesso di Laura Bianchi",
    requiresAction: true,
  },
];

// Mock recent requests
const recentRequests = [
  {
    type: "Ferie",
    period: "15/08/2023 - 22/08/2023",
    status: "pending",
  },
  {
    type: "Permesso",
    period: "05/07/2023",
    status: "approved",
  },
  {
    type: "Malattia",
    period: "20/06/2023 - 22/06/2023",
    status: "approved",
  },
];

// Mock projects
const projects = [
  { id: "project-1", name: "Progetto Alpha" },
  { id: "project-2", name: "Progetto Beta" },
  { id: "project-3", name: "Progetto Gamma" },
  { id: "project-4", name: "Progetto Delta" },
  { id: "project-5", name: "Progetto Epsilon" },
];

// Mock detailed projects - Updated with clientId
const projectsDetailed = [
  {
    id: "project-1",
    name: "Progetto Alpha",
    clientId: "client-1",
    client: "Acme Corporation",
    description:
      "Sviluppo di una piattaforma di e-commerce con funzionalità avanzate di gestione inventario e analisi delle vendite.",
    status: "active",
    startDate: "2023-01-15",
    endDate: "2023-12-31",
    team: [
      {
        id: "user-1",
        name: "Marco",
        surname: "Rossi",
        role: "developer",
        avatar: "/placeholder.svg",
      },
      {
        id: "user-2",
        name: "Laura",
        surname: "Bianchi",
        role: "designer",
        avatar: "/placeholder.svg",
      },
      {
        id: "user-3",
        name: "Giovanni",
        surname: "Verdi",
        role: "manager",
        avatar: "/placeholder.svg",
      },
    ],
  },
  {
    id: "project-2",
    name: "Progetto Beta",
    clientId: "client-2",
    client: "TechStart SRL",
    description:
      "Implementazione di un sistema di gestione documentale con workflow approvativo e integrazione con sistemi esterni.",
    status: "active",
    startDate: "2023-03-10",
    endDate: null,
    team: [
      {
        id: "user-1",
        name: "Marco",
        surname: "Rossi",
        role: "developer",
        avatar: "/placeholder.svg",
      },
      {
        id: "user-3",
        name: "Giovanni",
        surname: "Verdi",
        role: "manager",
        avatar: "/placeholder.svg",
      },
      {
        id: "user-5",
        name: "Alessandro",
        surname: "Gialli",
        role: "developer",
        avatar: "/placeholder.svg",
      },
    ],
  },
  {
    id: "project-3",
    name: "Progetto Gamma",
    clientId: "client-3",
    client: "Global Industries",
    description:
      "Sviluppo di un'applicazione mobile per la gestione delle presenze e delle attività aziendali.",
    status: "on-hold",
    startDate: "2023-02-01",
    endDate: null,
    team: [
      {
        id: "user-1",
        name: "Marco",
        surname: "Rossi",
        role: "developer",
        avatar: "/placeholder.svg",
      },
      {
        id: "user-3",
        name: "Giovanni",
        surname: "Verdi",
        role: "manager",
        avatar: "/placeholder.svg",
      },
    ],
  },
  {
    id: "project-4",
    name: "Progetto Delta",
    clientId: "client-3",
    client: "Global Industries",
    description:
      "Realizzazione di un portale web per la gestione delle risorse umane con funzionalità di reportistica avanzata.",
    status: "completed",
    startDate: "2022-11-01",
    endDate: "2023-05-30",
    team: [
      {
        id: "user-2",
        name: "Laura",
        surname: "Bianchi",
        role: "designer",
        avatar: "/placeholder.svg",
      },
      {
        id: "user-3",
        name: "Giovanni",
        surname: "Verdi",
        role: "manager",
        avatar: "/placeholder.svg",
      },
    ],
  },
  {
    id: "project-5",
    name: "Progetto Epsilon",
    clientId: "client-2",
    client: "TechStart SRL",
    description:
      "Sviluppo di un sistema di business intelligence per l'analisi dei dati aziendali.",
    status: "planned",
    startDate: "2023-09-01",
    endDate: null,
    team: [
      {
        id: "user-3",
        name: "Giovanni",
        surname: "Verdi",
        role: "manager",
        avatar: "/placeholder.svg",
      },
      {
        id: "user-5",
        name: "Alessandro",
        surname: "Gialli",
        role: "developer",
        avatar: "/placeholder.svg",
      },
    ],
  },
];

// Mock time entries - Updated to include workItemId
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();

const timeEntries = [
  {
    date: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-10`,
    project: "project-1",
    workItemId: "work-1",
    hours: 8,
    description: "Sviluppo frontend dashboard",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    date: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-11`,
    project: "project-1",
    workItemId: "work-1",
    hours: 7.5,
    description: "Implementazione API",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    date: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-12`,
    project: "project-2",
    workItemId: "work-3",
    hours: 8,
    description: "Meeting e pianificazione sprint",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    date: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-13`,
    project: "project-2",
    workItemId: "work-3",
    hours: 6,
    description: "Debugging e fix",
    status: "pending",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    date: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-14`,
    project: "project-3",
    workItemId: "work-4",
    hours: 8,
    description: "Sviluppo nuove funzionalità",
    status: "pending",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    date: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-10`,
    project: "project-1",
    workItemId: "work-2",
    hours: 7,
    description: "Design UI componenti",
    status: "approved",
    user: {
      id: "user-2",
      name: "Laura",
      surname: "Bianchi",
      avatar: "/placeholder.svg",
    },
  },
  {
    date: `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-11`,
    project: "project-4",
    workItemId: "work-6",
    hours: 8,
    description: "Revisione design sistema",
    status: "approved",
    user: {
      id: "user-2",
      name: "Laura",
      surname: "Bianchi",
      avatar: "/placeholder.svg",
    },
  },
];

// Mock leave requests - Aggiornati per includere date recenti e più dati
const leaveRequests = [
  {
    type: "vacation",
    period: `15/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear} - 22/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear}`,
    days: 5,
    reason: "Vacanza estiva",
    status: "pending",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "permission",
    period: `05/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear}`,
    days: 1,
    reason: "Visita medica",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "sickness",
    period: `20/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear} - 22/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear}`,
    days: 3,
    reason: "Influenza",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "vacation",
    period: `10/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear} - 14/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear}`,
    days: 5,
    reason: "Vacanza",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "permission",
    period: `08/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear}`,
    days: 1,
    reason: "Motivi personali",
    status: "approved",
    user: {
      id: "user-2",
      name: "Laura",
      surname: "Bianchi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "vacation",
    period: `01/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear} - 07/${(currentMonth + 1).toString().padStart(2, "0")}/${currentYear}`,
    days: 5,
    reason: "Ferie natalizie",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "permission",
    period: `12/${currentMonth.toString().padStart(2, "0")}/${currentYear}`,
    days: 1,
    reason: "Appuntamento bancario",
    status: "rejected",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "sickness",
    period: `25/${currentMonth.toString().padStart(2, "0")}/${currentYear}`,
    days: 1,
    reason: "Mal di testa",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "vacation",
    period: `18/${currentMonth.toString().padStart(2, "0")}/${currentYear} - 20/${currentMonth.toString().padStart(2, "0")}/${currentYear}`,
    days: 3,
    reason: "Weekend lungo",
    status: "pending",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "permission",
    period: `03/${currentMonth.toString().padStart(2, "0")}/${currentYear}`,
    days: 1,
    reason: "Trasloco",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "vacation",
    period: `28/${(currentMonth - 1).toString().padStart(2, "0")}/${currentYear} - 02/${currentMonth.toString().padStart(2, "0")}/${currentYear}`,
    days: 3,
    reason: "Ponte festivo",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "sickness",
    period: `15/${(currentMonth - 1).toString().padStart(2, "0")}/${currentYear} - 17/${(currentMonth - 1).toString().padStart(2, "0")}/${currentYear}`,
    days: 3,
    reason: "Febbre",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "permission",
    period: `10/${(currentMonth - 1).toString().padStart(2, "0")}/${currentYear}`,
    days: 1,
    reason: "Visita specialistica",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "vacation",
    period: `05/${(currentMonth - 1).toString().padStart(2, "0")}/${currentYear} - 09/${(currentMonth - 1).toString().padStart(2, "0")}/${currentYear}`,
    days: 5,
    reason: "Vacanza primaverile",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
  {
    type: "permission",
    period: `22/${(currentMonth - 2).toString().padStart(2, "0")}/${currentYear}`,
    days: 1,
    reason: "Matrimonio amico",
    status: "approved",
    user: {
      id: "user-1",
      name: "Marco",
      surname: "Rossi",
      avatar: "/placeholder.svg",
    },
  },
];

// Export functions to get mock data
export const getUserData = () => userData;
export const getUserSummary = () => userSummary;
export const getHoursData = () => hoursData;
export const getNotifications = () => notifications;
export const getRecentRequests = () => recentRequests;
export const getProjects = () => projects;
export const getTimeEntries = () => timeEntries;
export const getLeaveRequests = () => leaveRequests;

// New functions for detailed data
export const getAllUsers = () => users;
export const getProjectsDetailed = () => projectsDetailed;
export const getUserById = (id: string) => users.find((user) => user.id === id);
export const getProjectById = (id: string) => projectsDetailed.find((project) => project.id === id);

// Client functions
export const getAllClients = () => clientsData;
export const getClientById = (id: string) => clientsData.find((client) => client.id === id);
export const getActiveClients = () => clientsData.filter((client) => client.status === "active");

export const createClient = (clientData: Omit<(typeof clientsData)[0], "id" | "createdAt">) => {
  const newClient = {
    ...clientData,
    id: `client-${Date.now()}`,
    createdAt: new Date().toISOString().split("T")[0],
  };
  clientsData.push(newClient);
  return newClient;
};

export const updateClient = (id: string, updates: Partial<(typeof clientsData)[0]>) => {
  const clientIndex = clientsData.findIndex((client) => client.id === id);
  if (clientIndex !== -1) {
    clientsData[clientIndex] = { ...clientsData[clientIndex], ...updates };
    return clientsData[clientIndex];
  }
  return null;
};

export const deleteClient = (id: string) => {
  const clientIndex = clientsData.findIndex((client) => client.id === id);
  if (clientIndex !== -1) {
    clientsData.splice(clientIndex, 1);
    return true;
  }
  return false;
};

// Contract functions
export const getContractByEmployeeId = (employeeId: string) =>
  contractsData.find((contract) => contract.employeeId === employeeId);

export const updateContract = (employeeId: string, updates: Partial<(typeof contractsData)[0]>) => {
  const contractIndex = contractsData.findIndex((contract) => contract.employeeId === employeeId);
  if (contractIndex !== -1) {
    contractsData[contractIndex] = {
      ...contractsData[contractIndex],
      ...updates,
      lastModified: new Date().toISOString(),
    };
    return contractsData[contractIndex];
  }
  return null;
};

export const closeContract = (employeeId: string, closedBy: string) => {
  const contractIndex = contractsData.findIndex((contract) => contract.employeeId === employeeId);
  const userIndex = users.findIndex((user) => user.id === employeeId);

  if (contractIndex !== -1 && userIndex !== -1) {
    contractsData[contractIndex] = {
      ...contractsData[contractIndex],
      status: "not-active",
      endDate: new Date().toISOString().split("T")[0],
      lastModified: new Date().toISOString(),
      modifiedBy: closedBy,
    };
    users[userIndex].active = false;
    return contractsData[contractIndex];
  }
  return null;
};

// Functions to get related data
export const getTimeEntriesByProject = (projectId: string) => {
  return timeEntries
    .filter((entry) => entry.project === projectId)
    .map((entry) => ({
      ...entry,
      project: projects.find((p) => p.id === entry.project) || {
        id: entry.project,
        name: entry.project,
      },
    }));
};

export const getTimeEntriesByUser = (userId: string) => {
  return timeEntries
    .filter((entry) => entry.user.id === userId)
    .map((entry) => ({
      ...entry,
      project: projects.find((p) => p.id === entry.project) || {
        id: entry.project,
        name: entry.project,
      },
    }));
};

export const getTimeEntriesByWorkItem = (workItemId: string) => {
  return timeEntries
    .filter((entry) => entry.workItemId === workItemId)
    .map((entry) => ({
      ...entry,
      project: projects.find((p) => p.id === entry.project) || {
        id: entry.project,
        name: entry.project,
      },
    }));
};

export const getLeaveRequestsByUser = (userId: string) => {
  return leaveRequests.filter((request) => request.user.id === userId);
};

export const getProjectsByUser = (userId: string) => {
  const user = users.find((u) => u.id === userId);
  if (!user || !user.projects) return [];

  return user.projects
    .map((projectId) => projectsDetailed.find((p) => p.id === projectId))
    .filter(Boolean) as typeof projectsDetailed;
};

export const getProjectsByClient = (clientId: string) => {
  return projectsDetailed.filter((project) => project.clientId === clientId);
};
