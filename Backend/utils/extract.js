const moment = require('moment');
const { PDFExtract } =  require("pdf.js-extract");
const pdfExtract=new PDFExtract()
async function extractDataFromPDF(pdfFilePath) {
  const data = await pdfExtract.extract(pdfFilePath);
  let str='';
  let next = 1;
  let content = '';

    for(var i=0;i<data?.pages?.length;i++){
      var item = data?.pages[i];
    item.content.map((strs)=>{
      str+=strs.str;
      str+=' ';
    })

    if(str.split(" ").length < 50){
     str = "";
     next++;
    }else{
      content += str;
    }
    if(i==next || i > 4){
      break;
    }
  }
  console.log(content.length);
  if(content.length > 9000){
   content =  content.slice(0,8000);
  }
  console.log(content.length);
  return content;
}

async function PageCount(pdfFilePath) {
  const data = await pdfExtract.extract(pdfFilePath);
  let arr = data.pages;
  return arr.length;
}

function parseDate(input) {
    const potentialFormats = [
        'YYYY-MM-DD',
        'YYYY/MM/DD',
        'YYYY.MM.DD',
        'DD/MM/YYYY',
        'DD-MM-YYYY',
        'MMM DD, YYYY',
        'DD-MM-YY',
        'DD/MM/YY'
        // Add more formats as needed
    ];

    let parsedDate = null;
    for (let format of potentialFormats) {
        parsedDate = moment(input, format, true); // Attempt to parse the date with a strict mode
        if (parsedDate.isValid()) {
            return parsedDate.format('DD/MM/YYYY'); // Return formatted date as 'DD-MM-YY'
        }
    }

    return "NA";
}


module.exports =  {extractDataFromPDF,PageCount,parseDate};

