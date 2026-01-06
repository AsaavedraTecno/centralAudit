import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class BaseService {
  private apiUrl = 'http://127.0.0.1:8000/api';
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
		if(data.fk_empresa){
			uriBase = uriBase.concat(`?empresa_id=${data.fk_empresa}`);
		}
		if(data.id){
			uriBase = uriBase.concat(`&id=${data.id}`);
		}
		
		return this.http.get(uriBase,{headers});
	}
}