"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Save,
  Type,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generalSettingsSchema,
  type GeneralSettingsInput,
  update_general_settings_action,
} from "@/server/actions/organization_actions";

const COLOR_PRESETS = [
  { value: "purple", label: "Purple", swatch: "#7c3aed" },
  { value: "blue", label: "Blue", swatch: "#2563eb" },
  { value: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { value: "emerald", label: "Emerald", swatch: "#059669" },
  { value: "rose", label: "Rose", swatch: "#e11d48" },
  { value: "orange", label: "Orange", swatch: "#ea580c" },
  { value: "zinc", label: "Zinc", swatch: "#3f3f46" },
];

const FONT_OPTIONS = [
  { value: "sans", label: "Sans (modern)" },
  { value: "serif", label: "Serif (classic)" },
  { value: "mono", label: "Mono (technical)" },
] as const;

type Props = {
  initial: GeneralSettingsInput;
  rootDomain?: string;
};

const GeneralSettingsForm = ({ initial, rootDomain = "aplico.online" }: Props) => {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );

  const form = useForm<GeneralSettingsInput>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: initial,
  });

  const subdomain = form.watch("subdomain");
  const primaryColor = form.watch("primary_color");
  const companyName = form.watch("name");

  const careerUrl = useMemo(() => {
    const slug = (subdomain || "your-company").toLowerCase();
    return `https://${slug}.${rootDomain}`;
  }, [subdomain, rootDomain]);

  const activeSwatch =
    COLOR_PRESETS.find((c) => c.value === primaryColor)?.swatch ?? "#7c3aed";

  const onSubmit = (values: GeneralSettingsInput) => {
    setMessage(null);
    startTransition(async () => {
      try {
        await update_general_settings_action(values);
        setMessage({ type: "ok", text: "Settings saved successfully." });
        form.reset(values);
      } catch (e) {
        setMessage({
          type: "err",
          text: e instanceof Error ? e.message : "Failed to save settings",
        });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            General Settings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Company identity, contact details, and career-page branding for your
            organization.
          </p>
        </div>
        <Button
          type="submit"
          form="general-settings-form"
          disabled={pending || !form.formState.isDirty}
          className="shrink-0"
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save changes
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <Form {...form}>
        <form
          id="general-settings-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          {/* Company profile */}
          <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
                Company profile
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Company name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Acme Corp"
                        className="rounded-xl bg-zinc-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      Headquarters
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Miami, FL"
                        className="rounded-xl bg-zinc-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      Phone
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="305-555-0100"
                        className="rounded-xl bg-zinc-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="h-3 w-3" />
                      Company email
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="hiring@acme.com"
                        className="rounded-xl bg-zinc-50"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Shown on the public career page and used as a contact
                      fallback.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {/* Career page */}
          <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Globe className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
                Career page
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Subdomain
                    </FormLabel>
                    <FormControl>
                      <div className="flex rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
                        <Input
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value.toLowerCase().replace(/\s+/g, "-")
                            )
                          }
                          placeholder="acme"
                          className="border-0 rounded-none bg-transparent focus-visible:ring-0"
                        />
                        <div className="flex items-center px-3 text-sm text-zinc-400 border-l border-zinc-200 bg-zinc-100/80 whitespace-nowrap">
                          .{rootDomain}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription className="text-xs">
                      Public jobs URL:{" "}
                      <a
                        href={careerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary font-medium underline-offset-2 hover:underline"
                      >
                        {careerUrl}
                      </a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {/* Branding */}
          <section className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Palette className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-700">
                Branding
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="primary_color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Primary color
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {COLOR_PRESETS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => field.onChange(c.value)}
                              title={c.label}
                              className={`h-8 w-8 rounded-full border-2 transition ${
                                field.value === c.value
                                  ? "border-zinc-900 scale-110"
                                  : "border-transparent opacity-80 hover:opacity-100"
                              }`}
                              style={{ backgroundColor: c.swatch }}
                            />
                          ))}
                        </div>
                        <Input
                          {...field}
                          placeholder="purple or #7c3aed"
                          className="rounded-xl bg-zinc-50"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="font_family"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Type className="h-3 w-3" />
                      Font family
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl bg-zinc-50">
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FONT_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live preview card */}
              <div className="md:col-span-2 rounded-2xl border border-zinc-200 overflow-hidden">
                <div
                  className="px-5 py-4 text-white"
                  style={{ backgroundColor: activeSwatch }}
                >
                  <p className="text-[10px] uppercase tracking-widest opacity-80">
                    Career page preview
                  </p>
                  <p className="text-lg font-semibold mt-1">
                    {companyName || "Your company"}
                  </p>
                </div>
                <div className="px-5 py-4 bg-zinc-50 text-sm text-zinc-600">
                  Open roles at{" "}
                  <span className="font-medium text-zinc-900">
                    {companyName || "your company"}
                  </span>
                  . Branding color and font apply to the public jobs site.
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end pb-8">
            <Button type="submit" disabled={pending || !form.formState.isDirty}>
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default GeneralSettingsForm;
