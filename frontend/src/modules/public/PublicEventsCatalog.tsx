import React, { useEffect, useState } from 'react';
import { apiClient, EventCategory, EventItem } from '../../services/api';
import { Calendar, MapPin, Users, Search, Filter, ArrowRight, ShieldCheck, Ticket, LayoutGrid } from 'lucide-react';
import { eventCover, onCoverError } from '../../lib/eventMedia';
import { BrandMark } from '../../components/BrandMark';

interface PublicEventsCatalogProps {
  onSelectEvent: (event: EventItem) => void;
  onNavigateToLookup: () => void;
  onNavigateToAdmin: () => void;
}

export const PublicEventsCatalog: React.FC<PublicEventsCatalogProps> = ({
  onSelectEvent,
  onNavigateToLookup,
  onNavigateToAdmin,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchEvents();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/public/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory) params.category_id = selectedCategory;
      if (search) params.search = search;

      const res = await apiClient.get('/public/events', { params });
      setEvents(res.data.data || []);
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'registration_open':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">REGISTRATION OPEN</span>;
      case 'upcoming':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">UPCOMING</span>;
      case 'full':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">WAITLIST ONLY</span>;
      case 'ongoing':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">ONGOING</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">COMPLETED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">CLOSED</span>;
    }
  };

  const activeCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name ?? 'Events'
    : 'All Events';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Top Header */}
      <header className="bg-rhb-light text-rhb-navy sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandMark theme="light" size="md" />

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToLookup}
              className="px-3.5 py-2 rounded-lg border border-rhb-navy/25 hover:bg-white/40 text-xs font-medium text-rhb-navy flex items-center gap-1.5 transition-all"
            >
              <Ticket className="w-4 h-4" />
              <span>Find My Ticket</span>
            </button>
            <button
              onClick={onNavigateToAdmin}
              className="px-4 py-2 rounded-lg bg-rhb-blue hover:bg-indigo-700 text-xs font-medium text-white flex items-center gap-1.5 shadow-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Admin Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page title strip */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Staff Events &amp; Registration
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Browse internal conferences, townhalls, blood drives and workshops. Register and get your digital QR pass.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm shadow-sm transition-all shrink-0"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Main layout: category sidebar + event grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col lg:flex-row gap-8">
        {/* Category Sidebar */}
        <aside className="lg:w-60 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 lg:sticky lg:top-24">
            <p className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Categories
            </p>
            <nav className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === null
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>All Events</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/40"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate text-left">{cat.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Event Cards */}
        <main className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              {activeCategoryName}
              {!loading && <span className="ml-2 text-slate-400">({events.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                  <div className="h-40 bg-slate-200" />
                  <div className="p-6">
                    <div className="h-4 bg-slate-200 rounded-md w-1/3 mb-4" />
                    <div className="h-6 bg-slate-200 rounded-md w-3/4 mb-3" />
                    <div className="h-4 bg-slate-200 rounded-md w-full mb-6" />
                    <div className="h-10 bg-slate-100 rounded-xl w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Events Found</h3>
              <p className="text-sm text-slate-500 mt-1">Try another category or adjust your search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {events.map((event) => {
                const startDate = new Date(event.start_at);
                const capacityPercent = event.capacity > 0 ? Math.min(100, Math.round(((event.confirmed_count || 0) / event.capacity) * 100)) : 0;

                return (
                  <div
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer group overflow-hidden"
                  >
                    {/* Thumbnail */}
                    <div className="relative h-40 bg-slate-100 overflow-hidden">
                      <img
                        src={eventCover(event)}
                        onError={(e) => onCoverError(e, event)}
                        alt={event.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3">
                        {getStatusBadge(event.dynamic_status || event.status)}
                      </div>
                      {event.category?.name && (
                        <span
                          className="absolute bottom-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-white/95 backdrop-blur-sm"
                          style={{ backgroundColor: (event.category.color || '#00508f') + 'cc' }}
                        >
                          {event.category.name}
                        </span>
                      )}
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {event.event_code}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
                        {event.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                        {event.short_description || event.description || 'No description provided.'}
                      </p>

                      <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="truncate">{event.venue_name || event.city || (event.event_type === 'virtual' ? 'Online Virtual Event' : 'Venue TBD')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>
                            <strong>{event.confirmed_count || 0}</strong> / {event.capacity} Confirmed
                            {event.waitlist_count && event.waitlist_count > 0 ? ` • ${event.waitlist_count} on Waitlist` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Capacity Utilization Bar */}
                      <div className="mt-4">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              capacityPercent >= 100 ? 'bg-red-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${capacityPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:bg-indigo-50/50 transition-colors">
                      <span>View Event &amp; Register</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-center text-xs text-slate-400">
        <p>RHB Bank — Internal Events Platform · For authorised staff use only.</p>
      </footer>
    </div>
  );
};
