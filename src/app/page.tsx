'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { SortOption } from '@/types/sort';
import { Nav } from '@/components/Nav';
import { KanbanBoard } from '@/components/KanbanBoard';
import { CreateCardModal } from '@/components/CreateCardModal';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { Toast } from '@/components/Toast';

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

  async function handleProjectChange(project: string) {
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
  }

  async function handleCreateProject(name: string) {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const err = await res.json();
        setToast({ message: err.error ?? 'Failed to create project', type: 'error' });
        return;
      }

      const data = await res.json();
      setShowCreateProject(false);
      await fetchProjects();
      setSelectedProject(data.name);
      setToast({ message: 'Project created', type: 'success' });
    } catch {
      setToast({ message: 'Failed to create project', type: 'error' });
    }
  }

  async function handleCreateCard(cardData: {
    title: string;
    status?: string;
    priority?: string;
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
        projects={projects}
        selectedProject={selectedProject}
        onProjectChange={handleProjectChange}
        onNewProject={() => setShowCreateProject(true)}
        onNewCard={() => setShowCreateCard(true)}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {selectedProject ? (
        <KanbanBoard
          key={`${selectedProject}-${refreshKey}`}
          project={selectedProject}
          sortBy={sortBy}
        />
      ) : (
        <div className="flex items-center justify-center flex-1 text-obsidian-muted text-sm">
          Create a project to get started.
        </div>
      )}

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
