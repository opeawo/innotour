import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, BarChart3, Award } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-heading text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Run innovation tournaments
            <br />
            <span className="text-primary">that actually work</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            A structured platform where ideas compete, peers review peers, and
            the best innovations rise to the top — all without spreadsheets or
            manual coordination.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Start a tournament <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="lg" variant="outline">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-heading text-3xl font-semibold text-center text-foreground">
            Everything you need to run a tournament
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
                Peer Review
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Entrants review each other using your custom rubric. Fair,
                anonymous, and scalable to any size.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
                Algorithmic Stages
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Three stages — Group, Semi-Final, Final — automatically
                calculated based on your entry count.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
                Badges & Sharing
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Shareable achievement badges at every milestone. Built-in social
                sharing for LinkedIn, Instagram, and more.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
