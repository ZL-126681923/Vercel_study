"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/blog", label: "文章" },
  { href: "/bookmarks", label: "收藏" },
  { href: "/about", label: "关于" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-theme transition-colors duration-300">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-serif text-2xl tracking-tight text-theme-primary hover:text-[var(--accent)] transition-colors duration-300"
        >
          墨 · 迹
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <ul className="flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="relative text-theme-secondary hover:text-theme-primary transition-colors duration-300 text-sm tracking-wide group"
                >
                  {item.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-[var(--accent)] transition-all duration-300 group-hover:w-full" />
                </Link>
              </li>
            ))}
          </ul>
          <ThemeToggle />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-4 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-theme-secondary hover:text-theme-primary transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--bg-primary)]/95 backdrop-blur-xl border-b border-theme">
          <ul className="px-6 py-4 space-y-4">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-theme-secondary hover:text-theme-primary transition-colors text-lg"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
