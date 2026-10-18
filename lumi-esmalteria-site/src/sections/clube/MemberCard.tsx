import { TiltCard } from "@/components/ui/TiltCard";
import { cn } from "@/lib/utils";

/** Cartão de membro do Clube Lumi (puramente decorativo), com folha dourada e brilho de esmalte. */
function Card({ tone, name, className }: { tone: "wine" | "blush" | "sand"; name: string; className?: string }) {
  const bg = {
    wine: "linear-gradient(135deg, #8B2942 0%, #6C1F33 55%, #3f1220 100%)",
    blush: "linear-gradient(135deg, #F1E1DB 0%, #E8D5CE 50%, #D9BDB3 100%)",
    sand: "linear-gradient(135deg, #FAF3EA 0%, #F0E2D2 60%, #E3CDB4 100%)",
  }[tone];
  const dark = tone === "wine";
  return (
    <div className={cn("gloss relative aspect-[1.586/1] w-full overflow-hidden rounded-[22px] p-[7%] shadow-[0_40px_70px_-35px_rgba(108,31,51,0.55)]", className)} style={{ background: bg }}>
      {/* círculos concêntricos, como a marca d'água de um cartão */}
      <svg aria-hidden viewBox="0 0 200 200" className={cn("absolute -right-[18%] -top-[30%] h-[120%] w-auto", dark ? "text-gold/35" : "text-wine/15")}>
        {[40, 58, 76, 94].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="0.8" />
        ))}
      </svg>
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className={cn("font-display text-[clamp(1.4rem,3.2vw,2.1rem)] italic leading-none", dark ? "text-cream" : "text-wine")}>Clube Lumi</p>
            <p className={cn("eyebrow mt-2 !text-[0.55rem]", dark ? "text-blush/80" : "text-muted")}>Membro · plano {name}</p>
          </div>
          {/* "chip" dourado */}
          <span aria-hidden className="grid h-[22%] min-h-7 w-[13%] min-w-9 grid-cols-2 gap-px overflow-hidden rounded-md bg-gradient-to-br from-[#e9cfa9] via-[#C8A27A] to-[#a47e57] p-[3px] opacity-90">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i} className="rounded-[2px] border border-[#8a6a47]/30" />
            ))}
          </span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <p className={cn("font-display text-[clamp(0.95rem,1.6vw,1.15rem)] leading-tight", dark ? "text-blush" : "text-ink-soft")}>
            Autocuidado
            <br />
            <span className="italic">todo mês</span>
          </p>
          <span aria-hidden className="flex -space-x-2">
            {["#E3BFAF", "#B3122E", "#C8A27A"].map((c) => (
              <span key={c} className={cn("h-6 w-6 rounded-full ring-2", dark ? "ring-wine-deep" : "ring-cream")} style={{ background: c }} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Pilha de três cartões (um por plano), com inclinação 3D no da frente. */
export function MemberCardStack() {
  return (
    <div className="relative mx-auto w-full max-w-[500px] px-2 pb-6 pt-16 sm:px-6" role="img" aria-label="Cartões de membro do Clube Lumi nos planos Essencial, Lumi e Ritual">
      {/* "gloss" já define position: relative, por isso os cartões de trás ficam em invólucros absolutos */}
      <div className="absolute inset-x-8 top-0 -rotate-[7deg] sm:inset-x-12">
        <Card tone="sand" name="Ritual" />
      </div>
      <div className="absolute inset-x-6 top-7 rotate-[4deg] sm:inset-x-10">
        <Card tone="blush" name="Essencial" />
      </div>
      <TiltCard className="relative overflow-hidden rounded-[22px]" intensity={8}>
        <Card tone="wine" name="Lumi" />
      </TiltCard>
    </div>
  );
}
