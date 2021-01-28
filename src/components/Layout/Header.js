import React, { PureComponent,  } from 'react'
import PropTypes from 'prop-types'
import {  Layout,  Popover,  Modal } from 'antd';
import classnames from 'classnames'
import styles from './Header.less'
import bitcoinIcon from '../../../public/bitcoin_L.svg';
import ethereum from '../../../public/ETH.svg';
import metaMask from '../../../public/MetaMask.svg'
import dol from '../../../public/dol.svg'
import hbtc from '../../../public/hbtc.svg';
import heth from '../../../public/heth.svg'
import wht from '../../../public/wht.svg'
import linkGray from '../../../public/link_gray.svg'
import linkGreen from '../../../public/link_green.svg'
import { LoadingOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { globals} from '../../utils/constant';
import RealDAOService from '../../services/realdao'
import WalletService from '../../services/wallet'
import { connect } from 'umi';
import store from 'store';

class Header extends PureComponent {
  state = {
    walletVisible: true,
    priceStatus: true,
    networkState: true,
    repayVisible: false,
    iconList:[dol,hbtc,heth,wht]
  };
  componentDidMount() {
    console.log('----------------Header mount')
    globals.realDAO = new RealDAOService({
      config: {
        env: 'dev',
        provider: 'ws://127.0.0.1:8545',
        orchestrator: '0x34aaC809b8CBEb9011A6dC8Ab7eD7C825Ae5dE01'
      }
    });
    globals.realDAO.loadRTokens()
    globals.wallet = new WalletService()

    let that = this;
    that.props.dispatch({
      type: 'account/login'
    });
    setTimeout(function() {
      that.props.dispatch({
        type: 'account/queryPrice'
      });
    }, 15000)
    that.intervalId = setInterval(that.confirmPendingTransactions, 10000);
    that.refreshId = setInterval(function() {
      that.props.dispatch({
        type: 'account/queryPrice'
      });
    }, 15000)
  }

  componentWillUnmount() {
    clearInterval(this.intervalId);
    clearInterval(this.refreshId);
  }

  connectWallet(){
    const wallet = globals.wallet
    wallet
      .connect()
      .then(() => {
        this.login()
      })
      .catch((err) => {
        alert('Wallet Connect Error:' + err)
      })
  }


  login = () => {
    this.props.dispatch({
      type: 'account/login'
    });
  }


  async confirmPendingTransactions() {
    for (let i = 0; i < globals.pendingTransactions.length; i++) {
      const txHash = globals.pendingTransactions[i]
      const confirmed = await globals.realDAO.isTransactionConfirmed(txHash)
      if (confirmed) {
        console.log('Transaction confirmed:', txHash)
        globals.pendingTransactions.splice(i, 1)
        break
      }
    }
    store.set('pendingTransactions',globals.pendingTransactions)
  }

  showModal = () => {
    this.setState({
      repayVisible: true,
    });
  };

  handleOk = e => {
    this.setState({
      repayVisible: false,
    });
  };

  handleCancel = e => {
    this.setState({
      repayVisible: false,
    });
  };

  render() {
    const {
      theme,
      fixed,
      collapsed,
      connected,
      wrongNetwork,
      loginAccount,
      accountLiquidity,
      priceList
    } = this.props
    const { iconList} = this.state

    let pendingTransactions = globals.pendingTransactions;

    let processedAccount;
    let etherscanLink;
    let etherscan;
    if(loginAccount){
        let leftStr = loginAccount.slice(0,6);
        let rightStr = loginAccount.slice(loginAccount.length -6);
        const network = store.get('network');
        etherscan = network.etherscan;
        processedAccount = leftStr + '...'+ rightStr;
        etherscanLink = 'https://'+etherscan+'/address/'+loginAccount
    }

    const content = (
      <div className={styles.popoverContent}>
        <div className={styles.walletName}>
          <p className={styles.name}>{processedAccount}</p>
          <a href={etherscanLink} className={styles.linkArea}>
            <span>View on Etherscan</span>
            <img src={linkGray}/>
          </a>
        </div>
        <div className={styles.priceArea}>
          <p className={styles.priceDes}>{accountLiquidity.shortfall ===0 ? 'Account Liquidity' : 'Shortfall'}</p>
          <h3 className={accountLiquidity.shortfall ===0 ? styles.greenPrice : styles.redPrice}>{accountLiquidity.shortfall ===0 ? '$'+accountLiquidity.liquidityLiteral.toFixed(4) : '-$'+accountLiquidity.shortfallLiteral.toFixed(4)}</h3>
        </div>
        <div className={styles.transactionsArea}>
          <p className={styles.transactionsDes}>Your unfinished transactions</p>
          {pendingTransactions && pendingTransactions.length >0  ?
            <div className={styles.transactionsList}>
              {pendingTransactions.map((item,index) =>
                <div className={styles.transactionsItem} key={index}>
                  <a href={'https://'+etherscan+'/'+item} className={styles.leftItem}>
                    <p className={styles.name}>{item}</p>
                    <img src={linkGreen}/>
                  </a>
                  <LoadingOutlined style={{ color: '#707070' }} />
                </div>
              )}
            </div> : ''}
        </div>
      </div>
    );

    return (
      <Layout.Header
        className={classnames(theme ==='dark' ? styles.headerDark : styles.header, {
          [styles.fixed]: fixed,
          [styles.collapsed]: collapsed,
        })}
        id="layoutHeader"
      >
        <div className={styles.toolBar}>
          {priceList.map((item,index) =>
            <p className={styles.toolBarItem} key={index}>
              {/*<img src={item.anchorSymbol === 'ETH' ? ethereum : bitcoinIcon}/>*/}
              <img src={iconList[index]}/>
              <span>1 {item.anchorSymbol} = ${item.underlyingPriceLiteral.toFixed(2)}</span> </p>
          )}
        </div>
        {wrongNetwork ?
          <a href='javascript:' className={styles.networkWrong} onClick={this.showModal.bind(this)}><InfoCircleOutlined /><span>Wrong Network</span> </a>
         : <div>
            {connected ?
              <Popover placement="bottomRight" content={content} trigger="hover" overlayClassName={styles.popoverContainer}>
                <p className={styles.connectWallet}><span>{processedAccount}</span></p>
              </Popover>
              :
              <p onClick={this.connectWallet.bind(this)} className={styles.connectWallet}><img src={metaMask}/><span>Connect wallet</span> </p>
            }
          </div>
        }
        <Modal
          title=""
          visible={this.state.repayVisible}
          okText='Confirm'
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          footer={null}
          className={theme === 'dark' ? styles.modalDark : ''}
        >
          <div className={styles.dialogContent}>
            <div className={styles.title}>
              <h3 className={styles.dialogTitle}>Wrong Network</h3>
            </div>
            <p className={styles.increaseText}>Please connect to the appropriate Ethereum network.</p>
          </div>
        </Modal>
      </Layout.Header>
    )
  }
}

Header.propTypes = {
  fixed: PropTypes.bool,
  user: PropTypes.object,
  menus: PropTypes.array,
  collapsed: PropTypes.bool,
  onSignOut: PropTypes.func,
  notifications: PropTypes.array,
  onCollapseChange: PropTypes.func,
  onAllNotificationsRead: PropTypes.func,
}

function mapStateToProps(state) {
  return {
    connected: state.account.connected,
    wrongNetwork: state.account.wrongNetwork,
    loginAccount: state.account.loginAccount,
    accountLiquidity: state.account.accountLiquidity,
    priceList: state.account.priceList
  };
}

export default connect(mapStateToProps)(Header);
