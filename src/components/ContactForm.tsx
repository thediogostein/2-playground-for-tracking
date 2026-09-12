import { useCallback, useState } from "react";
import { ArrowRight, Building2, Check, Mail, Phone, User } from "lucide-react";
import PhoneInput, { type Country, isValidPhoneNumber } from "react-phone-number-input";
import phoneLabels from "react-phone-number-input/locale/pt-BR";
import "react-phone-number-input/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function getUTMs(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_term: params.get("utm_term") || "",
    utm_content: params.get("utm_content") || "",
  };
}

interface FormData {
  name: string;
  phone: string;
  email: string;
  company: string;
  revenue: string;
}

type FieldErrors = Partial<Record<keyof FormData, string>>;

interface FieldDef {
  id: keyof FormData;
  label: string;
  helper: string;
  icon: React.ElementType;
  placeholder: string;
  type: "text" | "tel" | "email" | "select";
}

const REVENUE_OPTIONS = [
  { value: "ate-10k", label: "Até R$ 10 mil" },
  { value: "10k-50k", label: "R$ 10 mil a R$ 50 mil" },
  { value: "50k-200k", label: "R$ 50 mil a R$ 200 mil" },
  { value: "200k-500k", label: "R$ 200 mil a R$ 500 mil" },
  { value: "500k-1m", label: "R$ 500 mil a R$ 1 milhão" },
  { value: "1m-5m", label: "R$ 1 milhão a R$ 5 milhões" },
  { value: "5m-10m", label: "R$ 5 milhões a R$ 10 milhões" },
  { value: "acima-10m", label: "Acima de R$ 10 milhões" },
  { value: "nao-informar", label: "Prefiro não informar" },
];

const FIELDS: FieldDef[] = [
  { id: "name", label: "Nome completo", helper: "Como podemos chamar você?", icon: User, placeholder: "Digite seu nome completo", type: "text" },
  { id: "phone", label: "WhatsApp", helper: "Selecione o país e informe o número", icon: Phone, placeholder: "Digite seu telefone", type: "tel" },
  { id: "email", label: "E-mail", helper: "Seu melhor e-mail para contato", icon: Mail, placeholder: "seu@email.com", type: "email" },
  { id: "company", label: "Empresa", helper: "O nome do seu negócio", icon: Building2, placeholder: "Nome da sua empresa", type: "text" },
  { id: "revenue", label: "Faturamento mensal", helper: "Selecione a faixa mais próxima", icon: Building2, placeholder: "Selecione a faixa de faturamento", type: "select" },
];

function validateField(id: keyof FormData, value: string): string {
  switch (id) {
    case "name":
      if (!value.trim()) return "Nome é obrigatório.";
      if (value.trim().length < 2) return "Mínimo 2 caracteres.";
      if (value.trim().length > 100) return "Máximo 100 caracteres.";
      return "";
    case "phone": {
      if (!value) return "WhatsApp é obrigatório.";
      if (!isValidPhoneNumber(value)) return "WhatsApp inválido para o país selecionado.";
      return "";
    }
    case "email":
      if (!value.trim()) return "E-mail é obrigatório.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "E-mail inválido.";
      return "";
    case "company":
      if (!value.trim()) return "Empresa é obrigatória.";
      if (value.trim().length > 150) return "Máximo 150 caracteres.";
      return "";
    case "revenue":
      if (!value) return "Selecione uma opção.";
      return "";
  }
}

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({ name: "", phone: "", email: "", company: "", revenue: "" });
  const [country, setCountry] = useState<Country | undefined>("BR");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const updateField = useCallback((id: keyof FormData, value: string) => {
    setFormData((previous) => ({ ...previous, [id]: value }));
    setErrors((previous) => ({ ...previous, [id]: undefined }));
    setSubmitError("");
  }, []);

  const validateOne = (id: keyof FormData) => {
    const error = validateField(id, formData[id]);
    setErrors((previous) => ({ ...previous, [id]: error || undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = FIELDS.reduce<FieldErrors>((fieldErrors, field) => {
      const error = validateField(field.id, formData[field.id]);
      if (error) fieldErrors[field.id] = error;
      return fieldErrors;
    }, {});

    setErrors(nextErrors);
    setSubmitError("");
    if (Object.keys(nextErrors).length > 0) {
      document.getElementById(Object.keys(nextErrors)[0])?.focus();
      return;
    }

    setStatus("loading");
    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: "form_submit_attempt",
      formId: "contact-form",
      phone_e164: formData.phone,
    });

    const submitData = {
      ...formData,
      whatsapp: formData.phone,
      ...getUTMs(),
    };

    try {
      const apiUrl = window.location.hostname === "localhost"
        ? "https://2-playground-for-tracking.pages.dev/api/contact"
        : "/api/contact";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        setStatus("success");
        (window as any).dataLayer.push({
          event: "form_submit_success",
          formId: "contact-form",
          revenue: formData.revenue,
          phone_e164: formData.phone,
        });
        window.setTimeout(() => { window.location.href = "/obrigado"; }, 800);
        return;
      }

      const message = result.errors
        ? result.errors.map((error: { message: string }) => error.message).join("\n")
        : result.error || "Erro ao enviar.";
      setSubmitError(message);
      setStatus("error");
      (window as any).dataLayer.push({
        event: "form_submit_error",
        formId: "contact-form",
        error: result.error || "validation_error",
        phone_e164: formData.phone,
      });
    } catch {
      setSubmitError("Erro de conexão. Verifique sua internet.");
      setStatus("error");
      (window as any).dataLayer.push({
        event: "form_submit_error",
        formId: "contact-form",
        error: "network_error",
        phone_e164: formData.phone,
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4">
      <Card className="border-0 shadow-xl shadow-primary/5">
        <CardHeader className="pb-4 text-center">
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Mail className="size-6" />
          </div>
          <CardTitle className="text-xl">Conte um pouco sobre você</CardTitle>
          <CardDescription>Preencha os dados abaixo e entraremos em contato.</CardDescription>
        </CardHeader>

        {status === "success" ? (
          <CardContent>
            <div className="flex flex-col items-center gap-3 py-10 text-center animate-in fade-in zoom-in-95">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="size-8 text-emerald-600" />
              </div>
              <p className="text-lg font-semibold text-emerald-700">Tudo pronto!</p>
              <p className="text-sm text-muted-foreground">Redirecionando...</p>
            </div>
          </CardContent>
        ) : (
          <form id="contact-form" noValidate onSubmit={handleSubmit}>
            <CardContent className="grid gap-5 px-6 pb-6 sm:px-8">
              {FIELDS.map((field) => {
                const Icon = field.icon;
                const error = errors[field.id];

                return (
                  <div key={field.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor={field.id} className="flex items-center gap-2">
                        <Icon className="size-4 text-primary" aria-hidden="true" />
                        {field.label}
                      </Label>
                      <span className="text-xs text-muted-foreground">{field.helper}</span>
                    </div>

                    {field.id === "phone" ? (
                      <PhoneInput
                        id="phone"
                        name="phone"
                        country={country}
                        onCountryChange={setCountry}
                        international
                        withCountryCallingCode
                        countryCallingCodeEditable={false}
                        labels={phoneLabels}
                        value={formData.phone}
                        onChange={(value) => updateField("phone", value || "")}
                        onBlur={() => validateOne("phone")}
                        placeholder={field.placeholder}
                        autoComplete="tel"
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "phone-error" : undefined}
                        className={`phone-field ${error ? "phone-field-error" : ""}`}
                      />
                    ) : field.type === "select" ? (
                      <select
                        id="revenue"
                        name="revenue"
                        value={formData.revenue}
                        onChange={(event) => updateField("revenue", event.target.value)}
                        onBlur={() => validateOne("revenue")}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "revenue-error" : undefined}
                        className={`flex h-12 w-full rounded-lg border bg-background px-4 py-3 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                          error ? "border-destructive focus-visible:ring-destructive" : "border-input"
                        } ${formData.revenue ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        <option value="" disabled>{field.placeholder}</option>
                        {REVENUE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={field.id}
                        name={field.id}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.id]}
                        onChange={(event) => updateField(field.id, event.target.value)}
                        onBlur={() => validateOne(field.id)}
                        inputMode={field.type === "tel" ? "numeric" : undefined}
                        autoComplete={field.id === "name" ? "name" : field.id === "email" ? "email" : field.id === "phone" ? "tel" : "organization"}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? `${field.id}-error` : undefined}
                        className={error ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                    )}

                    {error && <p id={`${field.id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
                  </div>
                );
              })}

              {submitError && (
                <p role="alert" className="whitespace-pre-line text-center text-sm text-destructive">{submitError}</p>
              )}
            </CardContent>

            <CardFooter className="px-6 pb-8 sm:px-8">
              <Button type="submit" size="lg" disabled={status === "loading"} className="w-full">
                {status === "loading" ? (
                  <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Enviando...</>
                ) : (
                  <>Enviar dados<ArrowRight className="size-4" /></>
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
