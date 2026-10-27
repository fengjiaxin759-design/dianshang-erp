async function renderAdTraffic(page){
 const epoch=state.renderEpoch,root=$('#workspace');let offset=0,serial=0,group=null,rows=[];
 const labels={keyword_text:'关键词',match_type:'匹配方式',search_term:'搜索词',placement:'广告位'};
 const dimensions={keywords:['keyword_text','match_type'],'search-terms':['search_term'],placement:['placement']};
 const placement={TOP_SEARCH:'搜索结果顶部',OTHER_SEARCH:'其他搜索位置',PRODUCT_PAGE:'商品页面'};
 const ratio=(value,percent)=>value==null?'—':(Number(value)*(percent?100:1)).toFixed(percent?2:4)+(percent?'%':'');
 root.innerHTML='<section class="report-page"><h1>'+esc(page.title)+'</h1><form class="business-filter" id="ad-traffic-filter"><label>开始日期<input type="date" name="date_from"></label><label>结束日期<input type="date" name="date_to"></label><label>店铺ID<input type="number" name="store_id" min="1"></label><label>活动ID<input type="number" name="campaign_id" min="1"></label><label>SKU<input name="sku" maxlength="100"></label><button type="submit">查询</button><button type="reset">重置</button></form><div id="ad-traffic-output" aria-live="polite"></div></section>';
 const form=$('#ad-traffic-filter'),output=$('#ad-traffic-output');
 const load=async()=>{
  const request=++serial;output.textContent='正在读取广告明细…';
  const params=new URLSearchParams({dimension:page.adDimension,limit:50,offset});for(const [key,value] of new FormData(form))if(value)params.set(key,value);if(group)params.set('group',JSON.stringify(group));
  try{
   const data=await api('/api/v1/ad-traffic?'+params);if(epoch!==state.renderEpoch||serial!==request)return;rows=data.items;
   const facts=data.view==='facts';const fields=[...(facts?[['business_date','日期'],['store_name','店铺'],['sku','SKU']]:[]),['campaign_name','广告活动'],...dimensions[page.adDimension].map(key=>[key,labels[key]]),['currency','币种'],['attribution_window_days','归因天数'],['impressions','曝光'],['clicks','点击'],['attributed_orders','归因订单'],['spend','花费'],['attributed_sales','归因销售'],['ctr','CTR'],['cpc','CPC'],['cvr','CVR'],['acos','ACOS'],['roas','ROAS']];
   const display=(row,key)=>['ctr','cvr','acos'].includes(key)?ratio(row[key],true):['cpc','roas'].includes(key)?ratio(row[key],false):key==='placement'?(placement[row[key]]||row[key]):row[key]==null?'未提供':row[key];
   output.innerHTML=(facts?'<button data-ad-back>返回汇总</button>':'')+'<div class="business-scroll"><table><thead><tr>'+fields.map(f=>'<th>'+esc(f[1])+'</th>').join('')+'<th>操作</th></tr></thead><tbody>'+rows.map((row,index)=>'<tr>'+fields.map(f=>'<td>'+esc(display(row,f[0]))+'</td>').join('')+'<td><button data-ad-campaign="'+row.campaign_id+'">活动</button>'+(facts?'<button data-ad-listing="'+row.listing_id+'">商品</button>':'<button data-ad-group="'+index+'">明细</button>')+'</td></tr>').join('')+'</tbody></table></div><div class="business-pagination"><span>共 '+data.total+' '+(facts?'条明细':'组')+'</span><button data-ad-prev '+(!offset?'disabled':'')+'>上一页</button><button data-ad-next '+(offset+50>=data.total?'disabled':'')+'>下一页</button></div>'+(rows.length?'':'<p>当前筛选无广告记录</p>');
  }catch(error){if(epoch===state.renderEpoch&&serial===request){output.textContent=error.message;const retry=document.createElement('button');retry.textContent='重试';retry.onclick=load;output.appendChild(retry);}}
 };
 form.onsubmit=event=>{event.preventDefault();offset=0;group=null;load();};form.onreset=()=>setTimeout(()=>{offset=0;group=null;if(epoch===state.renderEpoch)load();},0);
 output.onclick=event=>{const button=event.target.closest('button');if(!button||button.disabled)return;if(button.hasAttribute('data-ad-group')){group=rows[Number(button.dataset.adGroup)].group;offset=0;load();}if(button.hasAttribute('data-ad-back')){group=null;offset=0;load();}if(button.hasAttribute('data-ad-prev')){offset=Math.max(0,offset-50);load();}if(button.hasAttribute('data-ad-next')){offset+=50;load();}if(button.dataset.adCampaign)showDetail({id:Number(button.dataset.adCampaign)},'ad-campaigns');if(button.dataset.adListing)showDetail({id:Number(button.dataset.adListing)},'listings');};
 await load();
}
