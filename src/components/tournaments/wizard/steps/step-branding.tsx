"use client";

import { useState } from "react";
import { useWizard, useWizardDispatch } from "../wizard-context";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { stepBrandingSchema } from "@/lib/validators/tournament";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export function StepBranding() {
  const wizard = useWizard();
  const dispatch = useWizardDispatch();
  const trpc = useTRPC();

  const { branding } = wizard.data;
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(branding.bannerUrl || "");
  const [primaryColor, setPrimaryColor] = useState(branding.primaryColor || "#4F46E5");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateStep = useMutation(
    trpc.tournament.updateStep.mutationOptions({
      onError: (err) => toast.error(err.message),
    })
  );

  const handleNext = async () => {
    const data = { logoUrl, bannerUrl, primaryColor };
    const result = stepBrandingSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    try {
      await updateStep.mutateAsync({
        tournamentId: wizard.tournamentId!,
        step: 2,
        data: result.data,
      });
      dispatch({ type: "SET_STEP_DATA", key: "branding", data: result.data });
      dispatch({ type: "MARK_STEP_COMPLETE", step: 2 });
      dispatch({ type: "SET_CURRENT_STEP", step: 3 });
      toast.success("Branding saved");
    } catch {
      // handled
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Step 2 — Branding</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Tournament Logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Input
                placeholder="Paste logo URL (PNG/JPG, max 2MB)"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                File upload coming soon. Paste an image URL for now.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Banner Image</Label>
          <div className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Banner preview"
                className="h-full w-full rounded-lg object-cover"
              />
            ) : (
              <div className="text-center">
                <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">
                  1200 × 400px recommended
                </p>
              </div>
            )}
          </div>
          <Input
            placeholder="Paste banner image URL"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Primary Colour</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded border border-border"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-28 font-mono"
              maxLength={7}
            />
          </div>
          {errors.primaryColor && (
            <p className="text-sm text-destructive">{errors.primaryColor}</p>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "SET_CURRENT_STEP", step: 1 })}
          >
            Back
          </Button>
          <Button onClick={handleNext} disabled={updateStep.isPending}>
            {updateStep.isPending ? "Saving..." : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
