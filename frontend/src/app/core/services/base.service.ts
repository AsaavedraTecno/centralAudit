import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseService {
  private apiUrl = `${environment.apiUrl}`;
  headers:HttpHeaders;
  
  constructor(private http: HttpClient) {
    // Evitar error de localStorage en SSR usando window
    let token = '';
    if (typeof window !== 'undefined' && window.localStorage) {
      token = window.localStorage.getItem("token") || '';
    }
    
    this.headers=new HttpHeaders({
      "Content-Type": "application/json", 
      "Accept": "application/json",
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getQueryGet(query: string, id?: number){
		const headers = this.headers;
		let uriBase=`${this.apiUrl}/${query}`;
		if (id) {
			 uriBase=`${this.apiUrl}/${query}?id=${id}`;
		}  		

		return this.http.get(uriBase,{headers});
	}

  getQueryPost(query: string, datos: any){
		const headers = this.headers;
		const uriBase=`${this.apiUrl}/${query}`;


		return this.http.post(uriBase,datos,{headers});
	}

	getQueryPut(query: string, datos: any, id: number){
		const headers = this.headers;
		const uriBase=`${this.apiUrl}/${query}/${id}`;


		return this.http.put(uriBase,datos,{headers});
	}

	getQueryDelete(query: string, id: number){
		const headers = this.headers;
		const uriBase=`${this.apiUrl}/${query}/${id}`;

		return this.http.delete(uriBase,{headers});
	}

	getQueryOne(query: string, id: number){
		const headers = this.headers;
		const uriBase=`${this.apiUrl}/${query}/${id}`;


		return this.http.get(uriBase,{headers});
	}
	getQueryGetMulti(query: string, data: any){
		const headers = this.headers;
		let uriBase = `${this.apiUrl}/${query}`;
		const params: string[] = [];
		if(data.fk_empresa){
			params.push(`empresa_id=${data.fk_empresa}`);
		}
		if(data.id){
			params.push(`id=${data.id}`);
		}
		if(params.length > 0){
			uriBase += '?' + params.join('&');
		}
		
		return this.http.get(uriBase,{headers});
	}
}