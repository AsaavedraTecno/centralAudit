import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Cliente, Contacto } from '../../models/cliente';
import { Sucursal } from '../../models/sucursal';
import { isPlatformBrowser } from '@angular/common';

// --- Interfaces de modelos (se mantienen igual) ---
interface ClienteIndexado {
  rut: string;
  nombre: string;
  code: string;

  region?: string;
  comuna?: string;
  direccion?: string; 
  contactos?: Contacto[]; 
  sucursales?: Sucursal[];
}

interface SucursalIndexada {
  id: string | number;
  rut: string;
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
  id?: string;
  userId: string;
  timestamp: number;
}


// --- Clase de Base de Datos Dexie ---
class ClienteDatabase extends Dexie {
  clientes!: Table<ClienteIndexado>;
  sucursales!: Table<SucursalIndexada>;
  impresoras!: Table<ImpresioraIndexada>;
  sessionMetadata!: Table<SessionMetadata>;

  constructor() {
    super('ClienteDatabase');
    this.version(3).stores({
      clientes: 'rut, nombre, code', // Indices para búsqueda
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
  private db!: ClienteDatabase;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    if (this.isBrowser) {
      this.db = new ClienteDatabase();
      this.initDatabase();
    }
  }

  private async initDatabase(): Promise<void> {
    if (!this.isBrowser) return;
    try {
      await this.db.open();
    } catch (error) {
      console.error('Error inicializando IndexedDB:', error);
    }
  }

  async actualizarSessionMetadata(userId: string): Promise<void> {
    if (!this.isBrowser) return;
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

  async obtenerSessionMetadata(): Promise<SessionMetadata | undefined> {
    if (!this.isBrowser) return undefined;
    try {
      return await this.db.sessionMetadata.get('current');
    } catch (error) {
      console.warn('Error getting session metadata:', error);
      return undefined;
    }
  }

  async validarSessionActual(userId: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    try {
      const metadata = await this.obtenerSessionMetadata();
      if (!metadata || !metadata.userId) {
        await this.actualizarSessionMetadata(userId);
        return true;
      }
      
      const isValid = metadata.userId === userId;
      if (!isValid) {
        await this.limpiarBaseDatos();
        await this.actualizarSessionMetadata(userId);
      }
      return isValid;
    } catch (error) {
      console.warn('Error validating session:', error);
      return false;
    }
  }

  async guardarClientes(clientes: Cliente[]): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const clientesIndexados: ClienteIndexado[] = clientes.map(c => ({
        rut: c.rut,
        nombre: c.nombre,
        code: c.code,
        region: c.region,
        comuna: c.comuna,
        direccion: c.direccion,
        contactos: c.contactos, 
        sucursales: c.sucursales
      }));
      await this.db.clientes.bulkPut(clientesIndexados);
    } catch (error) {
      console.error('Error guardando clientes en IndexedDB:', error);
    }
  }

  async guardarSucursales(clienteRut: string, sucursales: Sucursal[]): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const sucursalesIndexadas: SucursalIndexada[] = sucursales.map(s => ({
        id: s.id || 0,
        rut: clienteRut,
        name: s.nombre
      }));
      await this.db.sucursales.bulkPut(sucursalesIndexadas);
    } catch (error) {
      console.error('Error guardando sucursales:', error);
    }
  }

  async guardarImpresoras(sucursalId: number, impresoras: any[]): Promise<void> {
    if (!this.isBrowser) return;
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

  async buscarPorRut(rut: string): Promise<ClienteIndexado | undefined> {
    if (!this.isBrowser) return undefined;
    try {
      return await this.db.clientes.get(rut);
    } catch (error) {
      console.error('Error buscando por RUT:', error);
      return undefined;
    }
  }

  async buscarPorNombre(nombre: string): Promise<ClienteIndexado[]> {
    if (!this.isBrowser) return [];
    try {
      return await this.db.clientes
        .where('nombre')
        .startsWithIgnoreCase(nombre)
        .toArray();
    } catch (error) {
      console.error('Error buscando por nombre:', error);
      return [];
    }
  }

  async obtenerSucursalesDelCliente(clienteRut: string): Promise<SucursalIndexada[]> {
    if (!this.isBrowser) return [];
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

  async obtenerImpresiorasDelaSucursal(sucursalId: number): Promise<ImpresioraIndexada[]> {
    if (!this.isBrowser) return [];
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

  async buscarImpresionaPorIp(ip: string): Promise<ImpresioraIndexada[]> {
    if (!this.isBrowser) return [];
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

  async busquedaGlobal(termino: string): Promise<any> {
    if (!this.isBrowser) return { clientes: [], impresoras: [], totalResultados: 0 };
    try {
      const clientesResultados = await this.buscarPorNombre(termino);
      const impresionasResultados = await this.db.impresoras
        .where('serie')
        .startsWithIgnoreCase(termino)
        .toArray();

      const clientesEnriquecidos = await Promise.all(
        clientesResultados.map(async (cliente) => {
          const sucursales = await this.obtenerSucursalesDelCliente(cliente.rut);
          return { ...cliente, sucursales };
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

  async obtenerTodosLosClientes(): Promise<ClienteIndexado[]> {
    if (!this.isBrowser) return [];
    try {
      return await this.db.clientes.toArray();
    } catch (error) {
      console.error('Error obteniendo todos los clientes:', error);
      return [];
    }
  }

  async contarClientes(): Promise<number> {
    if (!this.isBrowser) return 0;
    try {
      return await this.db.clientes.count();
    } catch (error) {
      console.error('Error contando clientes:', error);
      return 0;
    }
  }

  async limpiarBaseDatos(): Promise<void> {
    if (!this.isBrowser) return;
    try {
      await this.db.clientes.clear();
      await this.db.sucursales.clear();
      await this.db.impresoras.clear();
      this.db.close();
      
      if (typeof indexedDB !== 'undefined') {
        await new Promise((resolve, reject) => {
          const deleteRequest = indexedDB.deleteDatabase('ClienteDatabase');
          deleteRequest.onsuccess = () => {
            this.db = new ClienteDatabase();
            this.initDatabase();
            resolve(true);
          };
          deleteRequest.onerror = () => reject(deleteRequest.error);
        });
      }
    } catch (error) {
      console.error('Error limpiando base de datos:', error);
      throw error;
    }
  }

  async obtenerInfoBaseDatos(): Promise<any> {
    if (!this.isBrowser) return null;
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