import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Cliente } from '../models/cliente';
import { Sucursal } from '../models/sucursal';

// Modelo de datos para IndexedDB
interface ClienteIndexado {
  rut: string;
  nombre1?: string;
  cliente?: string;
  cod_clie?: string;
  sucursales?: Sucursal[];
}

interface SucursalIndexada {
  id: string | number;
  rut: string; // FK a cliente
  name?: string;
  impresoras?: any[];
}

interface ImpresioraIndexada {
  id: number;
  sucursalId: number;
  serie: string;
  ip: string;
  toner_black?: number;
  toner_cyan?: number;
  toner_magenta?: number;
  toner_yellow?: number;
}

interface SessionMetadata {
  id?: string; // Usar 'current' como key
  userId: string;
  timestamp: number;
}

// Base de datos con Dexie
class ClienteDatabase extends Dexie {
  clientes!: Table<ClienteIndexado>;
  sucursales!: Table<SucursalIndexada>;
  impresoras!: Table<ImpresioraIndexada>;
  sessionMetadata!: Table<SessionMetadata>;

  constructor() {
    super('ClienteDatabase');
    this.version(2).stores({
      // Índices para búsqueda rápida
      clientes: 'rut, nombre1, cliente, cod_clie',
      sucursales: 'id, rut, name',
      impresoras: 'id, sucursalId, ip, serie',
      sessionMetadata: 'id'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class ClienteIndexedDbService {
  private db = new ClienteDatabase();
  private isIndexed = false;

  constructor() {
    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    try {
      await this.db.open();
    } catch (error) {
      console.error('Error inicializando IndexedDB:', error);
    }
  }

  /**
   * Guardar/actualizar metadatos de sesión actual
   */
  async actualizarSessionMetadata(userId: string): Promise<void> {
    try {
      const metadata: SessionMetadata = {
        id: 'current',
        userId,
        timestamp: Date.now()
      };
      await this.db.sessionMetadata.put(metadata);
    } catch (error) {
      console.warn('Error saving session metadata:', error);
    }
  }

  /**
   * Obtener metadatos de sesión actual
   */
  async obtenerSessionMetadata(): Promise<SessionMetadata | undefined> {
    try {
      return await this.db.sessionMetadata.get('current');
    } catch (error) {
      console.warn('Error getting session metadata:', error);
      return undefined;
    }
  }

  /**
   * Validar que la sesión sea la misma (usuario no cambió)
   */
  async validarSessionActual(userId: string): Promise<boolean> {
    try {
      const metadata = await this.obtenerSessionMetadata();
      if (!metadata || !metadata.userId) {
        // Primera vez, guardar
        await this.actualizarSessionMetadata(userId);
        return true;
      }
      
      const isValid = metadata.userId === userId;
      if (!isValid) {
        // Usuario cambió, limpiar
        await this.limpiarBaseDatos();
        await this.actualizarSessionMetadata(userId);
      }
      return isValid;
    } catch (error) {
      console.warn('Error validating session:', error);
      return false;
    }
  }

  /**
   * Guardar clientes en IndexedDB
   */
  async guardarClientes(clientes: Cliente[]): Promise<void> {
    try {
      const clientesIndexados: ClienteIndexado[] = clientes.map(c => ({
        rut: c.rut,
        nombre1: c.nombre1,
        cliente: c.cliente,
        cod_clie: c.cod_clie
      }));

      await this.db.clientes.bulkPut(clientesIndexados);
    } catch (error) {
      console.error('Error guardando clientes en IndexedDB:', error);
    }
  }

  /**
   * Guardar sucursales en IndexedDB
   */
  async guardarSucursales(clienteRut: string, sucursales: Sucursal[]): Promise<void> {
    try {
      const sucursalesIndexadas: SucursalIndexada[] = sucursales.map(s => ({
        id: s.id || 0,
        rut: clienteRut,
        name: s.name
      }));

      await this.db.sucursales.bulkPut(sucursalesIndexadas);
    } catch (error) {
      console.error('Error guardando sucursales:', error);
    }
  }

  /**
   * Guardar impresoras en IndexedDB
   */
  async guardarImpresoras(sucursalId: number, impresoras: any[]): Promise<void> {
    try {
      const impresionasIndexadas: ImpresioraIndexada[] = impresoras.map(imp => ({
        id: imp.id || 0,
        sucursalId,
        serie: imp.serie,
        ip: imp.ip,
        toner_black: imp.toner_black,
        toner_cyan: imp.toner_cyan,
        toner_magenta: imp.toner_magenta,
        toner_yellow: imp.toner_yellow
      }));

      await this.db.impresoras.bulkPut(impresionasIndexadas);
    } catch (error) {
      console.error('Error guardando impresoras:', error);
    }
  }

  /**
   * Buscar clientes por RUT (búsqueda exacta)
   */
  async buscarPorRut(rut: string): Promise<ClienteIndexado | undefined> {
    try {
      return await this.db.clientes.get(rut);
    } catch (error) {
      console.error('Error buscando por RUT:', error);
      return undefined;
    }
  }

  /**
   * Buscar clientes por nombre (contiene)
   */
  async buscarPorNombre(nombre: string): Promise<ClienteIndexado[]> {
    try {
      const results = await this.db.clientes
        .where('nombre1')
        .startsWithIgnoreCase(nombre)
        .toArray();

      // Si no hay resultados, buscar en "cliente"
      if (results.length === 0) {
        return await this.db.clientes
          .where('cliente')
          .startsWithIgnoreCase(nombre)
          .toArray();
      }

      return results;
    } catch (error) {
      console.error('Error buscando por nombre:', error);
      return [];
    }
  }

  /**
   * Obtener todas las sucursales de un cliente
   */
  async obtenerSucursalesDelCliente(clienteRut: string): Promise<SucursalIndexada[]> {
    try {
      return await this.db.sucursales
        .where('rut')
        .equals(clienteRut)
        .toArray();
    } catch (error) {
      console.error('Error obteniendo sucursales:', error);
      return [];
    }
  }

  /**
   * Obtener todas las impresoras de una sucursal
   */
  async obtenerImpresiorasDelaSucursal(sucursalId: number): Promise<ImpresioraIndexada[]> {
    try {
      return await this.db.impresoras
        .where('sucursalId')
        .equals(sucursalId)
        .toArray();
    } catch (error) {
      console.error('Error obteniendo impresoras:', error);
      return [];
    }
  }

  /**
   * Buscar impresoras por IP
   */
  async buscarImpresionaPorIp(ip: string): Promise<ImpresioraIndexada[]> {
    try {
      return await this.db.impresoras
        .where('ip')
        .equals(ip)
        .toArray();
    } catch (error) {
      console.error('Error buscando impresora por IP:', error);
      return [];
    }
  }

  /**
   * Búsqueda global: cliente + sucursales + impresoras
   */
  async busquedaGlobal(termino: string): Promise<any> {
    try {
      const clientesResultados = await this.buscarPorNombre(termino);
      const impresionasResultados = await this.db.impresoras
        .where('serie')
        .startsWithIgnoreCase(termino)
        .toArray();

      // Enriquecer resultados con sucursales e impresoras
      const clientesEnriquecidos = await Promise.all(
        clientesResultados.map(async (cliente) => {
          const sucursales = await this.obtenerSucursalesDelCliente(cliente.rut);
          return {
            ...cliente,
            sucursales
          };
        })
      );

      return {
        clientes: clientesEnriquecidos,
        impresoras: impresionasResultados,
        totalResultados: clientesEnriquecidos.length + impresionasResultados.length
      };
    } catch (error) {
      console.error('Error en búsqueda global:', error);
      return { clientes: [], impresoras: [], totalResultados: 0 };
    }
  }

  /**
   * Obtener todos los clientes (para verificación)
   */
  async obtenerTodosLosClientes(): Promise<ClienteIndexado[]> {
    try {
      return await this.db.clientes.toArray();
    } catch (error) {
      console.error('Error obteniendo todos los clientes:', error);
      return [];
    }
  }

  /**
   * Contar total de clientes en IndexedDB
   */
  async contarClientes(): Promise<number> {
    try {
      return await this.db.clientes.count();
    } catch (error) {
      console.error('Error contando clientes:', error);
      return 0;
    }
  }

  /**
   * Limpiar base de datos y cerrar conexión
   */
  async limpiarBaseDatos(): Promise<void> {
    try {
      await this.db.clientes.clear();
      await this.db.sucursales.clear();
      await this.db.impresoras.clear();
      this.isIndexed = false;
      
      // Cerrar la base de datos
      this.db.close();
      
      // Intentar eliminar completamente la base de datos
      if (typeof indexedDB !== 'undefined') {
        await new Promise((resolve, reject) => {
          const deleteRequest = indexedDB.deleteDatabase('ClienteDatabase');
          deleteRequest.onsuccess = () => {
            console.log('ClienteDatabase completely deleted');
            // Reinitializar la base de datos
            this.db = new ClienteDatabase();
            this.initDatabase();
            resolve(true);
          };
          deleteRequest.onerror = () => {
            console.warn('Error deleting ClienteDatabase');
            reject(deleteRequest.error);
          };
        });
      }
    } catch (error) {
      console.error('Error limpiando base de datos:', error);
      throw error;
    }
  }

  /**
   * Obtener información de la base de datos (debug)
   */
  async obtenerInfoBaseDatos(): Promise<any> {
    try {
      const clientesCount = await this.db.clientes.count();
      const sucursalesCount = await this.db.sucursales.count();
      const impresionasCount = await this.db.impresoras.count();

      return {
        clientes: clientesCount,
        sucursales: sucursalesCount,
        impresoras: impresionasCount,
        indexedDB: {
          database: 'ClienteDatabase',
          version: 1,
          tables: ['clientes', 'sucursales', 'impresoras']
        }
      };
    } catch (error) {
      console.error('Error obteniendo info:', error);
      return null;
    }
  }
}
