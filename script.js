const sym = require('/node_modules/symbol-sdk');

let GENERATION_HASH;
let EPOCH;
let XYM_ID;
let NODE_URL;
let NET_TYPE;

let repo;
let accountRepo;
let txRepo;

let edgesArray = [];
let nodesArray = [];


//グラフ作成
async function makeGraph(_nodesArray,_edgesArray){

    //初期化処理

    let edgesArray =_edgesArray;
    let nodesArray =_nodesArray;

    console.log(edgesArray);
    console.log(nodesArray);


    var options = {};
    var nodes = new vis.DataSet(options);
    var edges = new vis.DataSet(options);
    nodes.add(nodesArray);
    edges.add(edgesArray);

    var container = document.getElementById('network');
    var data = {
        nodes: nodes,
        edges: edges
    };
    var options = {
        // physics: false, // 物理シミュレーション
        nodes: {
            shape: 'box', 
            size: 60,
            font: {
                color: 'black', 
            },
            color: "9875ff"
        },
        edges: {
            arrows: 'to', 
            smooth: false
        },
        groups: {
            myGroup: {color:{background:'9875ff'},borderWidth:3},
            otherGroup: {color:{background:'skyBlue'}, borderWidth:1}
        }
        // ,interaction:{hover:true}

    };
    var network = new vis.Network(container, data, options);

    network.on("click", function(params) {
        if (params.nodes.length == 1) {
          var nodeId = params.nodes[0];
          var node = nodes.get(nodeId);
          console.log(node.label + 'is clicked');
          console.log(nodeId + 'is clicked');
          nodeClick(nodeId);
        }
    });
}



//TxlistからTxDetail取得
async function getTxlistDetail(_Txlist){

    let Txlist = _Txlist;
    let txes = Txlist.data;
    console.log(txes.length);

    let c =0;
    for (let tx of txes){
        console.log("c:"+c);
        console.log(tx.type);
		switch(tx.type){			
            case 16724: //Transfer
                //JSON追加
                console.log("trtx");
                edgesArray.push({timestamp:tx.transactionInfo.timestamp,type:"sg-tr-tx",from: tx.signer.address.address, to: tx.recipientAddress.address,hash:tx.transactionInfo.hash});
                console.log("added"+c);
                break;
            case 16705: //Aggregate
                console.log("agtx");
                txInfo = await txRepo.getTransaction(tx.transactionInfo.hash,sym.TransactionGroup.Confirmed).toPromise();
                console.log(txInfo);
                if(txInfo.type == 16724){ //Aggregate の 一つだけTransfer
                    console.log("ag-sg-tr");
                    //JSON追加
                    edgesArray.push({timestamp:txInfo.transactionInfo.timestamp,type:"ag-sg-tr",from: txInfo.signer.address.address, to: txInfo.recipientAddress.address, hash:txInfo.transactionInfo.hash});
                    console.log("added"+c);
                }else{ //Aggregate の 複数Transfer
                    const inners = txInfo.innerTransactions;
                    console.log("inners");
                    console.log(inners);
                        for(let inner of inners){
                            //JSON追加
                            try{
                                console.log("ag-ml-tr");
                                edgesArray.push({timestamp:inner.transactionInfo.timestamp,type:"ag-ml-tr",from: inner.signer.address.address, to: inner.recipientAddress.address,hash:inner.transactionInfo.aggregateHash});
                            }catch(e){
                                console.log("error");
                                console.log(e);
                            }
                        }    
                    console.log("added"+c);
                }
                break;                        
            default: //Other
        }
        c = c+1;

    }
    return edgesArray;
}


//AccountInfoからTxlist取得
async function getTxlist(_MyAddress){
    let MyAddress = _MyAddress;
    const result = await txRepo.search(
        {
          group:sym.TransactionGroup.Confirmed,
          embedded:true,
          address:MyAddress
        }
    ).toPromise();
    return result;
}


//MyAddressからAccountInfo取得
async function getAccountInfo(_address){
    let address = _address;
    const AccountInfo = await accountRepo.getAccountInfo(address).toPromise();
    // console.log("accountInfo");
    // console.log(accountInfo);
    return AccountInfo;
}


async function searchAddress(_RawAddress){
    let RawAddress =_RawAddress;
    // let edgesArray = [];
    // let nodesArray = [];

    console.log(edgesArray);
    //初期化
    edgesArray.splice(0);
    nodesArray.splice(0);
    
    console.log(RawAddress);

    switch(RawAddress.substr(0,1)){
        case "N":
            console.log("main");

            GENERATION_HASH = '57F7DA205008026C776CB6AED843393F04CD458E0AA2D9F1D5F31A402072B2D6';
            EPOCH = 1615853185;
            XYM_ID = '6BED913FA20223F8';
            NODE_URL = 'https://symbol-mikun.net:3001';
            NET_TYPE = sym.NetworkType.MAIN_NET;

            document.getElementById('explorer').innerHTML= '<a href="https://symbol.fyi/accounts/'+RawAddress+'" target="_blank">['+RawAddress+'] on Symbol Explorer</a>';
            break;

        case "T":
            console.log("test");

            GENERATION_HASH = '7FCCD304802016BEBBCD342A332F91FF1F3BB5E902988B352697BE245F48E836';
            EPOCH = 1637848847;
            XYM_ID = '3A8416DB2D53B6C8';
            NODE_URL = 'https://sym-test-04.opening-line.jp:3001';
            NET_TYPE = sym.NetworkType.TEST_NET; 

            document.getElementById('explorer').innerHTML= '<a href="https://testnet.symbol.fyi/accounts/'+RawAddress+'" target="_blank">['+RawAddress+'] on Symbol Explorer</a>';
            break;

    }

    repo = new sym.RepositoryFactoryHttp(NODE_URL);
    accountRepo = repo.createAccountRepository();
    txRepo = repo.createTransactionRepository();
    

    console.log(NODE_URL);

    //RawAddressからMyAddress取得
    const MyAddress = sym.Address.createFromRawAddress(
        RawAddress
      );
      console.log("MyAddress");
      console.log(MyAddress); 

    //MyAddressからAccountInfo取得
    let AccountInfo = await getAccountInfo(MyAddress);
    console.log("AccountInfo");
    console.log(AccountInfo);    

    //AccountInfoからTxlist取得
    let Txlist = await getTxlist(MyAddress);
    console.log("Txlist");
    console.log(Txlist);

    //TxlistからTxDetail取得
    let TxDetail = await getTxlistDetail(Txlist);
    console.log("TxDetail");
    console.log(TxDetail);

    //nodesArray作成
    const fromList = TxDetail.map((obj) => obj.from);
    const toList = TxDetail.map((obj) => obj.to);
    let list = fromList.concat(toList);
    let list2 = [...new Set(list)];
    for (let e of list2){
        if(e === RawAddress){
            nodesArray.push({id:e,label:e.substr(0, 4)+"..."+e.slice(-4),group:"myGroup"});
            console.log("myGroup");

        }else{
            nodesArray.push({id:e,label:e.substr(0, 4)+"..."+e.slice(-4),group:"otherGroup"});
            console.log("otherGroup");

        }
    }
    // console.log(nodesArray);
    console.table(nodesArray);


    //edgesArray作成（TxDetailそのもの）
    edgesArray = TxDetail;
    // console.log(edgesArray);
    console.table(edgesArray);

    //グラフ作成
    await makeGraph(nodesArray,edgesArray);


}

async function searchClick(){
    console.log("clicked!");
    let element = document.getElementById('myAddress');
    console.log(element.value);
    document.getElementById('network').innerText="under investigation...";

    await searchAddress(element.value);
}

async function nodeClick(_node){
    let node = _node;
    document.getElementById("myAddress").value = node;
    console.log(node);
    document.getElementById('network').innerText="under investigation...";
    await searchAddress(node);
}
