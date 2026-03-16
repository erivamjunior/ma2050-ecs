"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const SIDEBAR_STORAGE_KEY = "ma2050-sidebar-collapsed";
const PROJECTS_MENU_STORAGE_KEY = "ma2050-projects-menu-open";
const INTERESTED_PARTIES_MENU_STORAGE_KEY = "ma2050-interested-parties-menu-open";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isProjectsRoute = pathname === "/projetos";
  const isInterestedPartiesRoute = pathname.startsWith("/partes-interessadas");
  const projectPhase = searchParams.get("fase") === "contratado" ? "contratado" : "banco";

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  });

  const [projectsMenuOpen, setProjectsMenuOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const savedValue = window.localStorage.getItem(PROJECTS_MENU_STORAGE_KEY);
    return savedValue === null ? true : savedValue === "true";
  });

  const [interestedPartiesMenuOpen, setInterestedPartiesMenuOpen] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const savedValue = window.localStorage.getItem(INTERESTED_PARTIES_MENU_STORAGE_KEY);
    return savedValue === null ? true : savedValue === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    window.localStorage.setItem(PROJECTS_MENU_STORAGE_KEY, String(projectsMenuOpen));
  }, [projectsMenuOpen]);

  useEffect(() => {
    window.localStorage.setItem(INTERESTED_PARTIES_MENU_STORAGE_KEY, String(interestedPartiesMenuOpen));
  }, [interestedPartiesMenuOpen]);

  return (
    <div className={`appShell ${sidebarCollapsed ? "appShellCollapsed" : ""}`}>
      <aside className={`sidebar ${sidebarCollapsed ? "sidebarCollapsed" : ""}`}>
        <div className="sidebarHeader">
          <Link href="/" className="brandLockup" aria-label="Ir para a home">
            <Image
              src="/logoma2050.svg"
              alt="Logo MA 2050"
              className="brandLogo"
              width={210}
              height={297}
              priority
            />
          </Link>

          <button
            type="button"
            className="sidebarToggle"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            title={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            <span aria-hidden="true">{sidebarCollapsed ? ">" : "<"}</span>
          </button>
        </div>

        <nav className="navMenu">
          <Link href="/cadastro" className={pathname === "/cadastro" ? "navLink navLinkActive" : "navLink"}>
            Cadastro
          </Link>

          <div className={`navGroup ${projectsMenuOpen ? "navGroupOpen" : ""}`}>
            <button
              type="button"
              className={`navGroupTrigger ${isProjectsRoute ? "navLinkActive" : ""}`}
              onClick={() => setProjectsMenuOpen((current) => !current)}
              aria-expanded={projectsMenuOpen}
            >
              <span>Projetos</span>
              <span className="navChevron" aria-hidden="true">{projectsMenuOpen ? "-" : "+"}</span>
            </button>
            <div className="navSubmenu">
              <Link
                href="/projetos?fase=banco"
                className={isProjectsRoute && projectPhase === "banco" ? "navLink navSubmenuLink navLinkActive" : "navLink navSubmenuLink"}
              >
                Banco de Projetos
              </Link>
              <Link
                href="/projetos?fase=contratado"
                className={isProjectsRoute && projectPhase === "contratado" ? "navLink navSubmenuLink navLinkActive" : "navLink navSubmenuLink"}
              >
                Projetos Contratados
              </Link>
            </div>
          </div>

          <div className={`navGroup ${interestedPartiesMenuOpen ? "navGroupOpen" : ""}`}>
            <button
              type="button"
              className={`navGroupTrigger ${isInterestedPartiesRoute ? "navLinkActive" : ""}`}
              onClick={() => setInterestedPartiesMenuOpen((current) => !current)}
              aria-expanded={interestedPartiesMenuOpen}
            >
              <span>Partes Envolvidas</span>
              <span className="navChevron" aria-hidden="true">{interestedPartiesMenuOpen ? "-" : "+"}</span>
            </button>
            <div className="navSubmenu">
              <Link
                href="/partes-interessadas/empresas"
                className={pathname === "/partes-interessadas/empresas" ? "navLink navSubmenuLink navLinkActive" : "navLink navSubmenuLink"}
              >
                Empresas
              </Link>
              <Link
                href="/partes-interessadas/secretarias"
                className={pathname === "/partes-interessadas/secretarias" ? "navLink navSubmenuLink navLinkActive" : "navLink navSubmenuLink"}
              >
                Secretarias
              </Link>
            </div>
          </div>

          <Link href="/fontes-recursos" className={pathname === "/fontes-recursos" ? "navLink navLinkActive" : "navLink"}>
            Fontes de Recursos
          </Link>
        </nav>
      </aside>

      <main className="contentArea">{children}</main>
    </div>
  );
}
