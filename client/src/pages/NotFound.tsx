import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";
import { TechLabel } from "@/components/tech";

export default function NotFound() {
  return (
    <Layout>
      <div className="container py-24 text-center">
        <span className="display text-[clamp(6rem,22vw,16rem)] leading-none text-stroke block">404</span>
        <TechLabel className="text-signal">Off the pitch</TechLabel>
        <h1 className="display text-4xl mt-3 mb-4">Page not found</h1>
        <p className="text-muted-foreground font-medium mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist — it may have been moved or deleted.
        </p>
        <Link href="/" className="btn btn-primary">Back home <ArrowRight className="w-4 h-4" /></Link>
      </div>
    </Layout>
  );
}
