import Image from "next/image";

import { Badge } from "@/components/ui/badge";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 md:px-8">
      <Badge variant="green">Brand Story</Badge>
      <h1 className="mt-4 font-display text-5xl">Lucky Caps</h1>
      <p className="mt-4 text-lg text-white/70">
        Lucky Caps is a streetwear imprint built for founders, late-night
        creators, and entrepreneurs who keep the city alive. Every drop is a
        limited batch made with premium materials, bold embroidery, and
        relentless attention to fit.
      </p>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="section-heading">Our ethos</p>
          <h2 className="font-display text-3xl">Wear the work</h2>
          <p className="text-white/70">
            We design hats that celebrate the grind: clean lines, dark tones, and
            the signature Lucky green for the moments when it all clicks. Every
            piece is meant to be worn in studio sessions, on pitch nights, and
            at the afterhours.
          </p>
        </div>
        <div className="relative min-h-[260px] overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <Image
            src="https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?auto=format&fit=crop&w=900&q=80"
<<<<<<< HEAD
            src="/products/cap-02.svg"
=======
>>>>>>> 2e5e4cd (fix: resolve home page parse error)
            alt="Lucky Caps story"
            fill
            className="object-cover"
          />
        </div>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {["Premium materials", "Limited edition drops", "Custom embroidery"].map(
          (item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70"
            >
              {item}
            </div>
          )
        )}
      </div>
    </div>
  );
}
