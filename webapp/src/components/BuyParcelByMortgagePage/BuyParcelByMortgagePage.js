import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Loader, Container, Header } from 'semantic-ui-react'

import Parcel from 'components/Parcel'
import { walletType } from 'components/types'
import { t, t_html } from 'modules/translation/utils'
import { locations } from 'locations'
import { buildCoordinate, formatMana } from 'lib/utils'
import { isPublicationOpen } from 'modules/publication/utils'
import MortgageForm from './MortgageForm'
import ParcelModal from 'components/ParcelModal'

export default class BuyParcelByMortgagePage extends React.PureComponent {
  static propTypes = {
    wallet: walletType,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    isDisabled: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool.isRequired,
    isConnected: PropTypes.bool.isRequired,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
  }

  renderLoading() {
    return (
      <div>
        <Loader active size="massive" />
      </div>
    )
  }

  renderNotConnected() {
    return (
      <div>
        <Container text textAlign="center" className="BuyParcelPage">
          <Header as="h2" size="huge" className="title">
            {t('mortgage.request')}
          </Header>
          <p className="sign-in">
            {t_html('global.sign_in_notice', {
              sign_in_link: (
                <Link to={locations.signIn}>{t('global.sign_in')}</Link>
              )
            })}
          </p>
        </Container>
      </div>
    )
  }

  render() {
    const { x, y, isLoading, isConnected, onConfirm, onCancel } = this.props
    if (isLoading) {
      return this.renderLoading()
    }

    if (!isConnected) {
      return this.renderNotConnected()
    }

    return (
      <Parcel x={x} y={y} ownerNotAllowed withPublications>
        {parcel =>
          isPublicationOpen(parcel.publication) ? (
            <React.Fragment>
              <ParcelModal
                x={x}
                y={y}
                price={parcel.publication.price}
                isLoading={isLoading}
                title={t('mortgage.request')}
                subtitle={t_html('mortgage.request_land', {
                  parcel_name: (
                    <Link to={locations.parcelDetail(x, y)}>
                      {buildCoordinate(x, y)}
                    </Link>
                  ),
                  parcel_price: formatMana(parcel.publication.price)
                })}
                hasCustomFooter
              >
                <MortgageForm
                  parcel={parcel}
                  publication={parcel.publication}
                  isTxIdle={false}
                  onPublish={onConfirm}
                  onCancel={onCancel}
                  isDisabled={false}
                />
              </ParcelModal>
            </React.Fragment>
          ) : null
        }
      </Parcel>
    )
  }
}
