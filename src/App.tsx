import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Clipboard,
  FolderCog,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Trash2,
  X
} from "lucide-react";

type Category = "SOCIAL" | "GAMING" | "WORK" | "WEB" | "OTHER";

type Service = {
  id: string;
  name: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
  _count?: { credentials: number };
};

type Credential = {
  id: string;
  serviceId: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
};

type Dashboard = {
  serviceCount: number;
  credentialCount: number;
  recentServices: Service[];
  lastActivity: { action: string; createdAt: string; service?: Service | null } | null;
};

const API = "http://localhost:4000/api";

const categories: { value: Category; label: string }[] = [
  { value: "SOCIAL", label: "Réseaux sociaux" },
  { value: "GAMING", label: "Gaming" },
  { value: "WORK", label: "Travail" },
  { value: "WEB", label: "Sites web" },
  { value: "OTHER", label: "Autres" }
];

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Une erreur est survenue.");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

function categoryLabel(value: Category) {
  return categories.find((item) => item.value === value)?.label ?? "Autres";
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-BE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function App() {
  const [page, setPage] = useState<"dashboard" | "services" | "resources">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshDashboard = async () => {
    const data = await api<Dashboard>("/dashboard");
    setDashboard(data);
  };

  const refreshServices = async (query = "") => {
    const data = await api<Service[]>(`/services${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setServices(data);
  };

  const openService = async (service: Service) => {
    const data = await api<Service & { credentials: Credential[] }>(`/services/${service.id}`);
    setSelectedService(data);
    setCredentials(data.credentials);
    setPage("services");
    setSidebarOpen(false);
  };

  useEffect(() => {
    refreshDashboard().catch(() => undefined);
    refreshServices().catch(() => undefined);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshServices(search).catch(() => undefined);
    }, 180);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const navigate = (next: typeof page) => {
    setPage(next);
    setSelectedService(null);
    setSidebarOpen(false);
  };

  const reload = async () => {
    await Promise.all([refreshDashboard(), refreshServices(search)]);
  };

  return (
    <div className="app-shell">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">OPIUMSTOCK</div>

        <nav>
          <NavItem active={page === "dashboard"} icon={<LayoutDashboard size={18} />} label="Tableau de bord" onClick={() => navigate("dashboard")} />
          <NavItem active={page === "services"} icon={<FolderCog size={18} />} label="Services" onClick={() => navigate("services")} />
          <NavItem active={page === "resources"} icon={<Settings size={18} />} label="Ressources" onClick={() => navigate("resources")} />
        </nav>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <strong>Système actif</strong>
            <span>Base PostgreSQL</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
            <Menu size={21} />
          </button>

          <div className="topbar-title">
            <span>OPIUMSTOCK</span>
            <strong>{page === "dashboard" ? "Tableau de bord" : page === "services" ? "Services" : "Ressources"}</strong>
          </div>

          <div className="topbar-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un service ou un mail..."
            />
            {search && <button onClick={() => setSearch("")}><X size={15} /></button>}
          </div>
        </header>

        <div className="content">
          <AnimatePresence mode="wait">
            <motion.div
              key={page + (selectedService?.id ?? "")}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {page === "dashboard" && (
                <DashboardPage
                  dashboard={dashboard}
                  services={services}
                  onOpen={openService}
                  onNavigate={navigate}
                />
              )}

              {page === "services" && (
                <ServicesPage
                  services={services}
                  selectedService={selectedService}
                  credentials={credentials}
                  search={search}
                  onOpen={openService}
                  onBack={() => setSelectedService(null)}
                />
              )}

              {page === "resources" && (
                <ResourcesPage
                  services={services}
                  onReload={reload}
                  onNotice={setNotice}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {notice && (
          <motion.div
            className="toast"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
          >
            <Check size={17} />
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {active && <motion.div className="nav-active-line" layoutId="active-line" />}
    </button>
  );
}

function DashboardPage({
  dashboard,
  services,
  onOpen,
  onNavigate
}: {
  dashboard: Dashboard | null;
  services: Service[];
  onOpen: (service: Service) => void;
  onNavigate: (page: "services" | "dashboard" | "resources") => void;
}) {
  const cards = [
    { label: "Services", value: dashboard?.serviceCount ?? 0, icon: <FolderCog size={19} /> },
    { label: "Entrées", value: dashboard?.credentialCount ?? 0, icon: <BarChart3 size={19} /> },
    { label: "Services récents", value: dashboard?.recentServices.length ?? 0, icon: <Activity size={19} /> }
  ];

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Vue générale</p>
          <h1>Votre espace de gestion.</h1>
          <p className="hero-copy">Centralisez vos services et leurs informations dans une interface claire et rapide.</p>
        </div>
        <button className="primary-btn" onClick={() => onNavigate("resources")}>
          <Plus size={17} /> Ajouter un service
        </button>
      </section>

      <section className="stat-grid">
        {cards.map((card, index) => (
          <motion.div
            className="stat-card"
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04, duration: 0.2 }}
          >
            <div className="stat-icon">{card.icon}</div>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow">Accès rapide</p>
          <h2>Services récemment modifiés</h2>
        </div>
        <button className="ghost-btn" onClick={() => onNavigate("services")}>Voir tous <ChevronRight size={16} /></button>
      </section>

      <div className="service-grid">
        {(dashboard?.recentServices ?? services.slice(0, 5)).map((service) => (
          <button className="service-card" key={service.id} onClick={() => onOpen(service)}>
            <div className="service-card-top">
              <span className="category-pill">{categoryLabel(service.category)}</span>
              <ChevronRight size={17} />
            </div>
            <h3>{service.name}</h3>
            <p>{service._count?.credentials ?? 0} entrée{(service._count?.credentials ?? 0) > 1 ? "s" : ""}</p>
            <small>Modifié {formatDate(service.updatedAt)}</small>
          </button>
        ))}
        {!(dashboard?.recentServices.length) && services.length === 0 && (
          <EmptyState text="Aucun service. Commencez par créer votre premier service." />
        )}
      </div>

      <section className="activity-panel">
        <div>
          <p className="eyebrow">Dernière activité</p>
          <h2>Historique</h2>
        </div>
        <div className="activity-row">
          <div className="activity-symbol"><Activity size={17} /></div>
          <div>
            <strong>{dashboard?.lastActivity ? activityLabel(dashboard.lastActivity.action) : "Aucune activité"}</strong>
            <span>{dashboard?.lastActivity ? formatDate(dashboard.lastActivity.createdAt) : "—"}</span>
          </div>
        </div>
      </section>
    </>
  );
}

function ServicesPage({
  services,
  selectedService,
  credentials,
  search,
  onOpen,
  onBack
}: {
  services: Service[];
  selectedService: Service | null;
  credentials: Credential[];
  search: string;
  onOpen: (service: Service) => void;
  onBack: () => void;
}) {
  if (selectedService) {
    return (
      <>
        <button className="back-btn" onClick={onBack}><ArrowLeft size={16} /> Tous les services</button>
        <section className="detail-header">
          <div>
            <span className="category-pill">{categoryLabel(selectedService.category)}</span>
            <h1>{selectedService.name}</h1>
            <p>{credentials.length} entrée{credentials.length > 1 ? "s" : ""} enregistrée{credentials.length > 1 ? "s" : ""}</p>
          </div>
        </section>
        <CredentialsTable credentials={credentials} />
      </>
    );
  }

  return (
    <>
      <section className="section-head first-head">
        <div>
          <p className="eyebrow">Bibliothèque</p>
          <h1>Services</h1>
          <p className="muted">{search ? `Résultats pour « ${search} »` : "Sélectionnez un service pour afficher ses entrées."}</p>
        </div>
      </section>

      <div className="service-list">
        {services.map((service) => (
          <button className="service-list-row" key={service.id} onClick={() => onOpen(service)}>
            <div className="service-name">
              <span className="service-initial">{service.name.charAt(0).toUpperCase()}</span>
              <div><strong>{service.name}</strong><span>{categoryLabel(service.category)}</span></div>
            </div>
            <span>{service._count?.credentials ?? 0} entrée{(service._count?.credentials ?? 0) > 1 ? "s" : ""}</span>
            <ChevronRight size={17} />
          </button>
        ))}
        {services.length === 0 && <EmptyState text="Aucun résultat." />}
      </div>
    </>
  );
}

function CredentialsTable({ credentials }: { credentials: Credential[] }) {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <section className="credential-panel">
      <div className="credential-head">
        <div>MAIL</div>
        <div>MOT DE PASSE</div>
      </div>
      {credentials.map((credential) => (
        <div className="credential-row" key={credential.id}>
          <div className="credential-cell">
            <span>{credential.email}</span>
            <button className="copy-btn" onClick={() => copy(credential.email, `${credential.id}-mail`)}>
              {copied === `${credential.id}-mail` ? <Check size={15} /> : <Clipboard size={15} />}
            </button>
          </div>
          <div className="credential-cell">
            <span>{visible[credential.id] ? credential.password : "••••••••••••"}</span>
            <div className="credential-actions">
              <button className="mini-btn" onClick={() => setVisible((old) => ({ ...old, [credential.id]: !old[credential.id] }))}>
                {visible[credential.id] ? "Masquer" : "Afficher"}
              </button>
              <button className="copy-btn" onClick={() => copy(credential.password, `${credential.id}-password`)}>
                {copied === `${credential.id}-password` ? <Check size={15} /> : <Clipboard size={15} />}
              </button>
            </div>
          </div>
        </div>
      ))}
      {credentials.length === 0 && <EmptyState text="Ce service ne contient aucune entrée." />}
    </section>
  );
}

function ResourcesPage({
  services,
  onReload,
  onNotice
}: {
  services: Service[];
  onReload: () => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(services[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("OTHER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState<Service | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!selectedId && services[0]) setSelectedId(services[0].id);
    if (selectedId && !services.some((s) => s.id === selectedId)) setSelectedId(services[0]?.id ?? "");
  }, [services, selectedId]);

  const selected = useMemo(() => services.find((s) => s.id === selectedId), [services, selectedId]);

  const createService = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const service = await api<Service>("/services", {
        method: "POST",
        body: JSON.stringify({ name: newName, category: newCategory })
      });
      setNewName("");
      setSelectedId(service.id);
      await onReload();
      onNotice("Service créé.");
    } finally {
      setBusy(false);
    }
  };

  const updateService = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await api(`/services/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editing.name, category: editing.category })
      });
      setEditing(null);
      await onReload();
      onNotice("Service modifié.");
    } finally {
      setBusy(false);
    }
  };

  const deleteService = async () => {
    if (!selected) return;
    if (!window.confirm(`Supprimer « ${selected.name} » et toutes ses entrées ?`)) return;
    setBusy(true);
    try {
      await api(`/services/${selected.id}`, { method: "DELETE" });
      await onReload();
      onNotice("Service supprimé.");
    } finally {
      setBusy(false);
    }
  };

  const addCredential = async () => {
    if (!selected || !email.trim() || !password) return;
    setBusy(true);
    try {
      await api(`/services/${selected.id}/credentials`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setEmail("");
      setPassword("");
      await onReload();
      onNotice("Entrée ajoutée.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="section-head first-head">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Ressources</h1>
          <p className="muted">Gérez les services et les entrées associées.</p>
        </div>
      </section>

      <div className="resource-grid">
        <section className="resource-card">
          <div className="resource-card-head">
            <div><span className="eyebrow">01</span><h2>Nouveau service</h2></div>
          </div>
          <div className="form-grid">
            <label>Nom<input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex. Discord" /></label>
            <label>Catégorie<select value={newCategory} onChange={(e) => setNewCategory(e.target.value as Category)}>
              {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select></label>
          </div>
          <button className="primary-btn" disabled={busy || !newName.trim()} onClick={createService}><Plus size={17} /> Créer le service</button>
        </section>

        <section className="resource-card">
          <div className="resource-card-head">
            <div><span className="eyebrow">02</span><h2>Gérer un service</h2></div>
          </div>
          <label>Service<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">Sélectionner...</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
          </select></label>
          {selected && (
            <div className="manage-actions">
              <button className="ghost-btn" onClick={() => setEditing(selected)}>Modifier</button>
              <button className="danger-btn" disabled={busy} onClick={deleteService}><Trash2 size={15} /> Supprimer</button>
            </div>
          )}
        </section>

        <section className="resource-card resource-wide">
          <div className="resource-card-head">
            <div><span className="eyebrow">03</span><h2>Ajouter une entrée</h2><p>{selected ? `Ajout pour ${selected.name}` : "Sélectionnez d'abord un service."}</p></div>
          </div>
          <div className="form-grid two">
            <label>Mail<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="adresse@email.com" /></label>
            <label>Mot de passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" /></label>
          </div>
          <button className="primary-btn" disabled={busy || !selected || !email.trim() || !password} onClick={addCredential}><Plus size={17} /> Ajouter</button>
        </section>
      </div>

      <AnimatePresence>
        {editing && (
          <div className="modal-layer">
            <motion.div className="modal" initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
              <div className="modal-head"><div><span className="eyebrow">Modifier</span><h2>Paramètres du service</h2></div><button className="icon-btn" onClick={() => setEditing(null)}><X size={18} /></button></div>
              <label>Nom<input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
              <label>Catégorie<select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as Category })}>
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select></label>
              <div className="modal-actions"><button className="ghost-btn" onClick={() => setEditing(null)}>Annuler</button><button className="primary-btn" disabled={busy || !editing.name.trim()} onClick={updateService}>Enregistrer</button></div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function activityLabel(action: string) {
  const map: Record<string, string> = {
    SERVICE_CREATED: "Service créé",
    SERVICE_UPDATED: "Service modifié",
    SERVICE_DELETED: "Service supprimé",
    CREDENTIAL_CREATED: "Entrée ajoutée",
    CREDENTIAL_UPDATED: "Entrée modifiée",
    CREDENTIAL_DELETED: "Entrée supprimée"
  };
  return map[action] ?? action;
}

export default App;