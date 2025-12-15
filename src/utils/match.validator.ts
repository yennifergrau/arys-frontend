import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador para un FormGroup que verifica si dos campos tienen el mismo valor.
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

    // Si no existen los controles, no validar
    if (!control || !matchingControl) {
      return null;
    }

    // Si ya hay un error en el campo de confirmación por otra regla (ej. formato), no añadir el error de coincidencia
    if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
      return null;
    }

    // Lógica de Coincidencia
    if (control.value !== matchingControl.value) {
      // Establecer el error en el control de confirmación
      control.setErrors({ mustMatch: true }); 
      matchingControl.setErrors({ mustMatch: true }); 
      return { mustMatch: true }; // Opcional: establecer el error también en el FormGroup
    } else {
      // Limpiar el error si coinciden
      control.setErrors(null);
      matchingControl.setErrors(null);
      return null;
    }
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