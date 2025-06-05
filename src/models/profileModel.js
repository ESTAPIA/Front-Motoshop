class ProfileModel {
  constructor(data) {
    this.cedula = data.cedula || '';
    this.nombre = data.cliNombre || '';
    this.apellido = data.cliApellido || '';
    this.telefono = data.cliTelefono || '';
    this.correo = data.cliCorreo || '';
  }

  getNombreCompleto() {
    if (this.nombre && this.apellido) {
      return `${this.nombre} ${this.apellido}`;
    } else if (this.nombre) {
      return this.nombre;
    } else if (this.apellido) {
      return this.apellido;
    } else {
      return 'Usuario';
    }
  }

  tieneInformacionCompleta() {
    return this.nombre && this.apellido && this.telefono && this.correo;
  }

  toFormData() {
    return {
      nombre: this.nombre,
      apellido: this.apellido,
      telefono: this.telefono,
      correo: this.correo
    };
  }
}

module.exports = ProfileModel;
