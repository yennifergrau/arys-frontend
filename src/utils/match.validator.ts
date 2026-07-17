import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador para un FormGroup que verifica si dos campos tienen el mismo valor.
 * Preserva otros errores del control (p. ej. formato o fortaleza de contraseña).
 * @param controlName El nombre del campo maestro (ej. 'email')
 * @param matchingControlName El nombre del campo de confirmación (ej. 'confirEmail')
 * @returns {ValidatorFn}
 */
export const matchFieldsValidator = (
  controlName: string,
  matchingControlName: string
): ValidatorFn => {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const control = formGroup.get(controlName);
    const matchingControl = formGroup.get(matchingControlName);

    if (!control || !matchingControl) {
      return null;
    }

    const clearMustMatch = (ctrl: AbstractControl) => {
      if (!ctrl.errors?.['mustMatch']) {
        return;
      }
      const { mustMatch: _ignored, ...rest } = ctrl.errors;
      ctrl.setErrors(Object.keys(rest).length ? rest : null);
    };

    const setMustMatch = (ctrl: AbstractControl) => {
      ctrl.setErrors({ ...(ctrl.errors || {}), mustMatch: true });
    };

    if (control.value !== matchingControl.value) {
      setMustMatch(control);
      setMustMatch(matchingControl);
      return { mustMatch: true };
    }

    clearMustMatch(control);
    clearMustMatch(matchingControl);
    return null;
  };
};

/**
 * Validador genérico que verifica que el valor de un control cumpla con un patrón RegExp dado.
 * @param regex La expresión regular a aplicar (ej. this.REGEX_STRING).
 * @param errorName El nombre del error a asignar si falla (ej. 'nombreInvalido').
 * @returns {ValidatorFn}
 */
export function formatValidator(regex: RegExp, errorName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    // Si el campo está vacío, la validación de formato no aplica,
    // deja que Validators.required maneje el vacío.
    if (!value) {
      return null;
    }

    // Compara el valor con la expresión regular
    const isValid = regex.test(value);

    // Si no es válido, devuelve el objeto de error con el nombre especificado
    if (!isValid) {
      return { [errorName]: true };
    }

    // Si es válido, devuelve null (sin errores)
    return null;
  };
}

/**
 * Lista corta de contraseñas comunes que se rechazan explícitamente.
 * El control definitivo (lista completa tipo HIBP) debe estar en el backend.
 */
const COMMON_PASSWORDS = [
  '123456', '1234567', '12345678', '123456789', '1234567890',
  'password', 'contrasena', 'contraseña', 'qwerty', 'abc123',
  '111111', '000000', 'iloveyou', 'admin', 'arys', 'arys123',
];

/**
 * Validador de contraseña fuerte.
 * Exige longitud mínima, mayúscula, minúscula, número y símbolo,
 * y rechaza contraseñas comunes.
 *
 * Errores posibles (para mostrar en UI):
 * - passwordMinLength, passwordUppercase, passwordLowercase,
 *   passwordNumber, passwordSymbol, passwordCommon
 *
 * @param minLength Longitud mínima (por defecto 10).
 * @returns {ValidatorFn}
 */
export function strongPasswordValidator(minLength: number = 10): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value;

    // Dejar el vacío a Validators.required
    if (!value) {
      return null;
    }

    if (COMMON_PASSWORDS.includes(value.toLowerCase())) {
      return { passwordCommon: true };
    }
    if (value.length < minLength) {
      return { passwordMinLength: true };
    }
    if (!/[A-ZÁÉÍÓÚÑ]/.test(value)) {
      return { passwordUppercase: true };
    }
    if (!/[a-záéíóúñ]/.test(value)) {
      return { passwordLowercase: true };
    }
    if (!/[0-9]/.test(value)) {
      return { passwordNumber: true };
    }
    if (!/[^A-Za-z0-9]/.test(value)) {
      return { passwordSymbol: true };
    }

    return null;
  };
}

/**
 * Devuelve un mensaje legible para el primer error de contraseña fuerte encontrado.
 * Útil para mostrar en toasts/inline. Devuelve null si no hay error relevante.
 */
export function strongPasswordErrorMessage(
  errors: ValidationErrors | null,
  minLength: number = 10
): string | null {
  if (!errors) return null;
  if (errors['passwordCommon']) return 'La contraseña es demasiado común; elige una más segura.';
  if (errors['passwordMinLength']) return `La contraseña debe tener al menos ${minLength} caracteres.`;
  if (errors['passwordUppercase']) return 'La contraseña debe incluir al menos una mayúscula.';
  if (errors['passwordLowercase']) return 'La contraseña debe incluir al menos una minúscula.';
  if (errors['passwordNumber']) return 'La contraseña debe incluir al menos un número.';
  if (errors['passwordSymbol']) return 'La contraseña debe incluir al menos un símbolo.';
  return null;
}

/**
 * Formatea un texto de matrícula (ej. AA514ES) insertando un guion
 * después del tercer carácter (ej. AA5-14ES).
 * * @param matricula El texto de la matrícula a formatear.
 * @returns La matrícula formateada.
 */
export function formatearMatricula(matricula: string): string {
    if (!matricula || matricula.length < 3) {
        return ''; 
    }
    const matriculaMayusculas = matricula.toUpperCase();

    // Reemplaza los primeros 3 caracteres (\w{3}) con ellos mismos ($1) seguidos de un guion
    return matriculaMayusculas.replace(/^(\w{3})/, '$1-');
}