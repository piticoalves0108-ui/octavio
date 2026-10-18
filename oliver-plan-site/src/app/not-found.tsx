import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="container-x blueprint flex min-h-[80svh] flex-col items-start justify-center pt-32">
      <p className="eyebrow text-stone">Erro 404 · Fora de esquadro</p>
      <h1 className="display-xl mt-6 max-w-[12ch]">
        Esta página não está <span className="serif-accent">na planta</span>.
      </h1>
      <p className="mt-6 max-w-md text-stone">O endereço pode ter mudado. Que tal voltar ao início ou explorar os ambientes?</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button href="/">Voltar ao início</Button>
        <Button href="/ambientes" variant="outline" arrow={false}>
          Ver ambientes
        </Button>
      </div>
    </section>
  );
}
