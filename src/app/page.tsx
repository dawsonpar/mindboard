'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { type SortOption, SORT_LABELS } from '@/types/sort';
import { Nav } from '@/components/Nav';
import { KanbanBoard, type KanbanBoardHandle } from '@/components/KanbanBoard';
import { Sidebar } from '@/components/Sidebar';
import { CreateCardModal } from '@/components/CreateCardModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { Toast } from '@/components/Toast';
import type { CommandAction } from '@/components/CommandBar';

interface AppConfig {
  rootDir: string;
  lastSelectedProject: string | null;
}

export default function Home() {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const boardRef = useRef<KanbanBoardHandle>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects ?? []);
      return data.projects ?? [];
    } catch {
      setToast({ message: 'Failed to load projects', type: 'error' });
      return [];
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const configRes = await fetch('/api/config');
        const configData: AppConfig = await configRes.json();
        setConfig(configData);

        if (!configData.rootDir) {
          router.push('/settings');
          return;
        }

        const projectList = await fetchProjects();

        if (
          configData.lastSelectedProject &&
          projectList.includes(configData.lastSelectedProject)
        ) {
          setSelectedProject(configData.lastSelectedProject);
        } else if (projectList.length > 0) {
          setSelectedProject(projectList[0]);
        }
      } catch {
        setToast({ message: 'Failed to load configuration', type: 'error' });
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router, fetchProjects]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'Comma') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleProjectChange = useCallback(async (project: string) => {
    setSelectedProject(project);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastSelectedProject: project }),
      });
    } catch {
      // Non-critical, ignore
    }
  }, []);

  const handleSelectCard = useCallback(
    (project: string, filename: string) => {
      if (project !== selectedProject) {
        handleProjectChange(project);
      }
      router.push(
        `/card/${encodeURIComponent(project)}/${encodeURIComponent(filename)}`,
      );
    },
    [selectedProject, handleProjectChange, router],
  );

  // The ">" command catalog. Search lives in the bar's default mode; these are
  // the actions. Card-scoped actions (archive) reach the board through boardRef.
  const commands: CommandAction[] = useMemo(() => {
    const base: CommandAction[] = [
      {
        id: 'new-card',
        title: 'New card',
        keywords: ['create', 'add', 'task'],
        run: () =>
          selectedProject
            ? setShowCreateCard(true)
            : setToast({ message: 'Select a project first', type: 'info' }),
      },
      {
        id: 'new-project',
        title: 'New project',
        keywords: ['create', 'add'],
        run: () => setShowCreateProject(true),
      },
      {
        id: 'archive-completed',
        title: 'Archive completed cards',
        keywords: ['archive', 'clear', 'done', 'clean'],
        run: () => boardRef.current?.archiveCompleted(),
      },
      {
        id: 'toggle-archive',
        title: 'Show or hide archive',
        keywords: ['archive', 'view', 'hidden'],
        run: () => boardRef.current?.toggleArchive(),
      },
      {
        id: 'toggle-sidebar',
        title: 'Toggle project sidebar',
        keywords: ['sidebar', 'projects', 'panel'],
        shortcut: '⌘⇧,',
        run: () => setSidebarOpen((v) => !v),
      },
      {
        id: 'toggle-actions',
        title: 'Toggle actions and filters',
        keywords: ['toolbar', 'actions', 'filters', 'archive', 'sort', 'new card', 'hide', 'show'],
        run: () => setShowActions((v) => !v),
      },
    ];
    const sortCmds: CommandAction[] = (Object.keys(SORT_LABELS) as SortOption[]).map(
      (opt) => ({
        id: `sort-${opt}`,
        title: `Sort by ${SORT_LABELS[opt].toLowerCase()}`,
        keywords: ['sort', 'order', SORT_LABELS[opt]],
        run: () => setSortBy(opt),
      }),
    );
    const projectCmds: CommandAction[] = projects.map((p) => ({
      id: `goto-${p}`,
      title: `Go to project: ${p}`,
      keywords: ['project', 'switch', 'jump', 'go', p],
      run: () => handleProjectChange(p),
    }));
    return [...base, ...sortCmds, ...projectCmds];
  }, [projects, selectedProject, handleProjectChange]);

  async function handleCreateProject(name: string): Promise<boolean> {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error ?? 'Failed to create project', type: 'error' });
        return false;
      }

      const data = await res.json();
      setShowCreateProject(false);
      await fetchProjects();
      setSelectedProject(data.name);
      setToast({ message: 'Project created', type: 'success' });
      return true;
    } catch {
      setToast({ message: 'Failed to create project', type: 'error' });
      return false;
    }
  }

  async function handleCreateCard(cardData: {
    title: string;
    status?: string;
    priority?: string;
    complexity?: number;
    description?: string;
  }) {
    if (!selectedProject) return;

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cardData, project: selectedProject }),
      });

      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error ?? 'Failed to create card', type: 'error' });
        return;
      }

      setShowCreateCard(false);
      setRefreshKey((k) => k + 1);
      setToast({ message: 'Card created', type: 'success' });
    } catch {
      setToast({ message: 'Failed to create card', type: 'error' });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-obsidian-muted text-sm">
        Loading...
      </div>
    );
  }

  if (config && !config.rootDir) {
    return null; // Redirecting to settings
  }

  return (
    <div className="flex flex-col h-screen">
      <Nav
        onSelectCard={handleSelectCard}
        commands={commands}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex flex-1 min-h-0">
        <div
          className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-out ${
            sidebarOpen ? 'w-60' : 'w-0'
          }`}
        >
          <Sidebar
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={handleProjectChange}
            onCreateProject={handleCreateProject}
          />
        </div>

        <div className="flex flex-1 min-w-0 flex-col">
          {selectedProject ? (
            <KanbanBoard
              ref={boardRef}
              key={`${selectedProject}-${refreshKey}`}
              project={selectedProject}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onNewCard={() => setShowCreateCard(true)}
              showActions={showActions}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-obsidian-muted text-sm">
              Create a project to get started.
            </div>
          )}
        </div>
      </div>

      {showCreateCard && selectedProject && (
        <CreateCardModal
          onClose={() => setShowCreateCard(false)}
          onCreate={handleCreateCard}
        />
      )}

      {showCreateProject && (
        <CreateProjectModal
          onClose={() => setShowCreateProject(false)}
          onCreate={handleCreateProject}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
