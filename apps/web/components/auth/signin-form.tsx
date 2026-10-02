"use client";

import {
  Alert01Icon,
  Eye,
  EyeOff,
  Login01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { signIn } from "@youlearn/auth/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Spinner } from "../ui/spinner";

const formSchema = z.object({
  email: z.email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      setPending(true);
      setError(undefined);

      const { error } = await signIn.email(value);

      if (error) {
        setError(error.message ?? "L'authentification a échouée");
        setPending(false);
        return;
      }
      router.replace("/");
      router.refresh();
    },
  });

  return (
    <form
      className="p-6 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Bon retour</h1>
          <p className="text-balance text-muted-foreground">
            Authentifiez-vous à votre compte{" "}
            <span className="text-primary font-semibold">YouLearn</span>
          </p>
        </div>
        <form.Field
          name="email"
          // biome-ignore lint/correctness/noChildrenProp: shadcn pattern
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="signin-email">Email</FieldLabel>

                <Input
                  id="signin-email"
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="m@example.com"
                  required
                  type="email"
                  autoComplete="email"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <form.Field
          name="password"
          // biome-ignore lint/correctness/noChildrenProp: shadcn pattern
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <div className="flex items-center">
                  <FieldLabel htmlFor="signin-password">
                    Mot de passe
                  </FieldLabel>
                  <Link
                    href="#"
                    className="ml-auto text-xs underline-offset-2 hover:underline"
                  >
                    Mot de passe oublié?
                  </Link>
                </div>
                <InputGroup>
                  <InputGroupInput
                    id="signin-password"
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    required
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                  />
                  <InputGroupAddon align="inline-end">
                    <HugeiconsIcon
                      icon={showPassword ? Eye : EyeOff}
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputGroupAddon>
                </InputGroup>

                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />

        {error && (
          <Alert variant="destructive" className="max-w-md">
            <HugeiconsIcon icon={Alert01Icon} />

            <AlertTitle>Echec d'authentification</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : <HugeiconsIcon icon={Login01Icon} />}
            Login
          </Button>
        </Field>

        <FieldDescription className="text-center">
          Pas encore de compte ? Rapprochez-vous de votre manager
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
