"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

export default function VerificationEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="flex items-center justify-center gap-2 text-lg font-semibold">
          <GraduationCap className="size-6 text-primary" />
          {APP_NAME}
        </Link>

        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="size-7 text-primary" />
            </div>
            <CardTitle>Vérifiez votre adresse e-mail</CardTitle>
            <CardDescription>
              Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login">Aller à la connexion</Link>
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Mauvaise adresse ?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Modifier mon inscription
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
