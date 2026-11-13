import React from 'react'
import { ArrowLeft, Terminal, Cpu, Orbit, Radio, Shield, Sparkles, Compass, Rocket } from 'lucide-react'
import { Reticle } from './ui'

interface TeamMember {
  name: string
  role: string
  callsign: string
  division: string
  icon: React.ComponentType<{ className?: string }>
}

interface TeamProps {
  onBack: () => void
}

const MEMBERS: TeamMember[] = [
  {
    name: 'Akib Hasan Pyil',
    role: 'Team Leader, Full-Stack Architect, AI Pipeline',
    callsign: 'CREW-01',
    division: 'Flight Software & Deterministic AI Architecture',
    icon: Terminal,
  },
  {
    name: 'Nazat E Rose Rhythm',
    role: 'Frontend & UX',
    callsign: 'CREW-02',
    division: 'Reticle Instrument Design & User Experience',
    icon: Cpu,
  },
  {
    name: 'Jafir Islam Siam',
    role: 'Developer',
    callsign: 'CREW-03',
    division: 'Core Math Algorithms & Flammability Engine',
    icon: Orbit,
  },
  {
    name: 'Tauhid Sarker',
    role: 'Pitcher/Presenter',
    callsign: 'CREW-04',
    division: 'Mission Briefing & Technical Storytelling',
    icon: Radio,
  },
  {
    name: 'Arnob Das',
    role: 'Data Engineering & Analysis',
    callsign: 'CREW-05',
    division: 'NASA Investigation Ingestion & Provenance Audit',
    icon: Shield,
  },
]

export const Team: React.FC<TeamProps> = ({ onBack }) => {
  return (
    <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-6 space-y-6">
      {/* ─── Breadcrumb / Mission Control Header Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] px-3 py-1.5 rounded-[6px] transition-colors"
          title="Return to Dashboard Instrument"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>RETURN TO DASHBOARD</span>
        </button>

        <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-tertiary)]">
          <span className="hidden sm:inline">MISSION // 2026 NASA SPACE APPS</span>
          <span className="hidden sm:inline">&middot;</span>
          <span className="text-[var(--text-secondary)]">DHAKA LOCAL EVENT</span>
          <span>&middot;</span>
          <span className="inline-flex items-center gap-1.5 text-[var(--check-pass)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--check-pass)] animate-pulse" />
            CREW VERIFIED
          </span>
        </div>
      </div>

      {/* ─── Mission Control Spec Sheet Hero: 2-Column Desktop ─── */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Team Photo (Square, Technical Frame) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-sm sm:max-w-md relative group">
              {/* Corner reticle decorations */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-[var(--ember)] z-10" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-[var(--ember)] z-10" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-[var(--ember)] z-10" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-[var(--ember)] z-10" />

              <div className="aspect-square w-full relative overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] shadow-[var(--shadow-md)]">
                <img
                  src="/team-image.png"
                  alt="Team Turtlers — 2026 NASA Space Apps Challenge"
                  className="w-full h-full aspect-square object-cover"
                  onError={(e) => {
                    const target = e.currentTarget
                    if (!target.src.endsWith('team_image.png')) {
                      target.src = '/team_image.png'
                    }
                  }}
                />

                {/* Tactical overlay badge */}
                <div className="absolute bottom-2 left-2 right-2 bg-[var(--bg-canvas)]/85 backdrop-blur-[2px] border border-[var(--border-subtle)] px-2.5 py-1.5 rounded-[4px] flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1.5">
                    <Reticle size={12} pulse={false} />
                    <span>OPTICAL RECORD</span>
                  </span>
                  <span className="text-[var(--text-tertiary)]">DHAKA // 2026</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Mission Credits & Technical Overview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[var(--ember-muted)] border border-[var(--ember)]/30 text-[11px] font-mono text-[var(--ember)] tracking-wider uppercase">
                <Rocket className="h-3 w-3" />
                <span>Challenge 8 &middot; Flame in Freefall</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
                TEAM TURTLERS
              </h1>
              <p className="text-sm sm:text-[15px] font-mono text-[var(--text-secondary)]">
                2026 NASA Space Apps Challenge — Dhaka Local Event
              </p>
            </div>

            <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] leading-relaxed">
              We engineered <strong className="text-[var(--text-primary)] font-semibold">AegnyxZero</strong> — an evidence-first, deterministic fire-safety decision instrument designed to protect human spaceflight crews on the Moon, Mars, and beyond.
            </p>

            {/* Spec Sheet Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 font-mono text-xs">
              <div className="bg-[var(--bg-inset)] border border-[var(--border-subtle)] p-2.5 rounded-[6px] space-y-0.5">
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">PROJECT</div>
                <div className="text-[var(--text-primary)] font-medium">AegnyxZero</div>
              </div>

              <div className="bg-[var(--bg-inset)] border border-[var(--border-subtle)] p-2.5 rounded-[6px] space-y-0.5">
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">ARCHITECTURE</div>
                <div className="text-[var(--text-primary)] font-medium">FastAPI + React 19</div>
              </div>

              <div className="bg-[var(--bg-inset)] border border-[var(--border-subtle)] p-2.5 rounded-[6px] space-y-0.5 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">VALIDATION</div>
                <div className="text-[var(--check-pass)] font-medium">V1–V7 Pure Python</div>
              </div>

              <div className="bg-[var(--bg-inset)] border border-[var(--border-subtle)] p-2.5 rounded-[6px] space-y-0.5">
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">INVESTIGATIONS</div>
                <div className="text-[var(--text-primary)] font-medium">5 NASA Facilities</div>
              </div>

              <div className="bg-[var(--bg-inset)] border border-[var(--border-subtle)] p-2.5 rounded-[6px] space-y-0.5">
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">FLIGHT DATA</div>
                <div className="text-[var(--text-primary)] font-medium">33 Curated Runs</div>
              </div>

              <div className="bg-[var(--bg-inset)] border border-[var(--border-subtle)] p-2.5 rounded-[6px] space-y-0.5 col-span-2 sm:col-span-1">
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">DEPLOYMENT</div>
                <div className="text-[var(--text-primary)] font-medium">Zero-Cost Offline</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Member Roster Section ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-[var(--text-tertiary)] select-none">
              MEMBER ROSTER // TECHNICAL ROLES &amp; SPECIALIZATIONS
            </span>
          </div>
          <span className="text-xs font-mono text-[var(--text-tertiary)]">5 ACTIVE OPERATORS</span>
        </div>

        {/* Member Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MEMBERS.map((member) => {
            const Icon = member.icon
            return (
              <div
                key={member.name}
                className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-md p-4 transition-all duration-150 flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[var(--text-tertiary)] group-hover:text-[var(--ember)] transition-colors">
                      [{member.callsign}]
                    </span>
                    <div className="p-1 rounded-[4px] bg-[var(--bg-inset)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
                      {member.name}
                    </h3>
                    <p className="text-xs font-mono text-[var(--ember)] mt-0.5">
                      {member.role}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
                  <span className="text-[11px] text-[var(--text-tertiary)] font-mono block">
                    {member.division}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Mission Control Roster Complement Card */}
          <div className="bg-[var(--bg-inset)] border border-dashed border-[var(--border-subtle)] rounded-md p-4 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="font-mono text-[11px] text-[var(--text-tertiary)]">[MANIFEST-STATUS]</span>
              <div className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[var(--ember)]" />
                <span>All Stations Nominal</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Full flight deck coverage across systems architecture, user interface, combustion mathematics, and data verification.
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-tertiary)]">
              LOCATION: DHAKA LOCAL EVENT
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Quote / Transmission Log Panel ─── */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md p-5 relative overflow-hidden">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-[6px] bg-[var(--ember-muted)] border border-[var(--ember)]/30 text-[var(--ember)] shrink-0 mt-0.5">
            <Compass className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">
              MISSION TRANSMISSION // TEAM NOTE
            </div>
            <p className="text-sm text-[var(--text-primary)] font-medium leading-relaxed italic">
              &ldquo;Built with 48 hours of caffeine, curiosity, and code. AegnyxZero is our contribution to making the next giant leap a safer one.&rdquo;
            </p>
            <div className="text-[11px] font-mono text-[var(--text-secondary)] pt-0.5">
              &mdash; Team Turtlers, NASA Space Apps Challenge 2026 (Dhaka)
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

