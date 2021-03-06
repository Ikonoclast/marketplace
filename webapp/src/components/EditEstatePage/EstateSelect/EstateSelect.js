import React from 'react'
import PropTypes from 'prop-types'
import {
  Message,
  Header,
  Icon,
  Grid,
  Container,
  Button
} from 'semantic-ui-react'
import { t } from '@dapps/modules/translation/utils'

import AssetPreviewHeader from 'components/AssetPreviewHeader'
import ParcelCoords from 'components/ParcelCoords'
import TxStatus from 'components/TxStatus'
import EstateName from 'components/EstateName'
import { parcelType, estateType } from 'components/types'
import { isOwner } from 'shared/asset'
import {
  getParcelMatcher,
  isEqualCoords,
  getParcelsNotIncluded
} from 'shared/parcel'
import {
  hasNeighbour,
  areConnected,
  isEstate,
  MAX_PARCELS_PER_TX
} from 'shared/estate'
import { buildCoordinate } from 'shared/coordinates'
import EstateSelectActions from './EstateSelectActions'
import './EstateSelect.css'

export default class EstateSelect extends React.PureComponent {
  static propTypes = {
    estate: estateType.isRequired,
    pristineEstate: estateType,
    allParcels: PropTypes.objectOf(parcelType),
    wallet: PropTypes.object.isRequired,
    isCreation: PropTypes.bool.isRequired,
    isTxIdle: PropTypes.bool.isRequired,
    onCancel: PropTypes.func.isRequired,
    onCreateCancel: PropTypes.func.isRequired,
    onContinue: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onDeleteEstate: PropTypes.func.isRequired
  }

  handleParcelClick = ({ asset, x, y }) => {
    const { wallet } = this.props

    if (!isOwner(wallet, buildCoordinate(x, y)) && !isOwner(wallet, asset.id)) {
      return
    }

    const { estate, onChange } = this.props
    const parcels = estate.data.parcels

    if (isEstate(asset) && asset.id !== estate.id) {
      return
    }

    if (!hasNeighbour(x, y, parcels)) {
      return
    }

    const parcel = { x, y }
    const isSelected = parcels.some(getParcelMatcher(parcel))
    if (isSelected) {
      if (this.hasReachedRemoveLimit()) {
        return
      }
      const newParcels = parcels.filter(
        coords => !isEqualCoords(coords, parcel)
      )
      if (!areConnected(newParcels)) {
        return
      }
      return onChange(newParcels)
    }

    if (this.hasReachedAddLimit()) {
      return
    }

    onChange([...parcels, { x, y }])
  }

  haveParcelsChanged = parcels => {
    const { pristineEstate } = this.props
    if (!pristineEstate) {
      return false
    }

    const pristineParcels = pristineEstate ? pristineEstate.data.parcels : []
    if (pristineParcels.length != parcels.length) {
      return true
    }

    if (
      getParcelsNotIncluded(parcels, pristineParcels).length ||
      getParcelsNotIncluded(pristineParcels, parcels).length
    ) {
      return true
    }

    return false
  }

  hasParcels(parcels) {
    return parcels.length > 1
  }

  getParcelsToAdd() {
    const { estate, pristineEstate } = this.props
    const newParcels = estate.data.parcels
    const pristineParcels = pristineEstate ? pristineEstate.data.parcels : []
    return getParcelsNotIncluded(newParcels, pristineParcels)
  }

  getParcelsToRemove() {
    const { estate, pristineEstate } = this.props
    const newParcels = estate.data.parcels
    const pristineParcels = pristineEstate ? pristineEstate.data.parcels : []
    return getParcelsNotIncluded(pristineParcels, newParcels)
  }

  hasReachedAddLimit() {
    const parcelsToAdd = this.getParcelsToAdd()
    return parcelsToAdd.length >= MAX_PARCELS_PER_TX
  }

  hasReachedRemoveLimit() {
    const parcelsToRemove = this.getParcelsToRemove()
    return parcelsToRemove.length >= MAX_PARCELS_PER_TX
  }

  getEstateParcels() {
    const { estate, allParcels } = this.props
    const parcels = []

    for (const { x, y } of estate.data.parcels) {
      const parcel = allParcels[buildCoordinate(x, y)]
      if (parcel) parcels.push(parcel)
    }
    return parcels
  }

  renderTxLabel = () => {
    const parcelsToAdd = this.getParcelsToAdd()
    const parcelsToRemove = this.getParcelsToRemove()
    return (
      <React.Fragment>
        {!!parcelsToAdd.length && (
          <p className="tx-label">
            {t('estate_select.tx_to_be_send', {
              action: t('global.add'),
              parcels: parcelsToAdd.map(({ x, y }) => `(${x},${y})`).join(', ')
            })}
          </p>
        )}
        {!!parcelsToRemove.length && (
          <p className="tx-label">
            {t('estate_select.tx_to_be_send', {
              action: t('global.remove'),
              parcels: parcelsToRemove
                .map(({ x, y }) => `(${x},${y})`)
                .join(', ')
            })}
          </p>
        )}
      </React.Fragment>
    )
  }

  render() {
    const {
      estate,
      onCancel,
      onContinue,
      onSubmit,
      wallet,
      allParcels,
      isCreation,
      onCreateCancel,
      isTxIdle,
      onDeleteEstate
    } = this.props

    const parcels = estate.data.parcels
    const canEdit = isCreation || isOwner(wallet, estate.id)

    return (
      <div className="EstateSelect">
        <AssetPreviewHeader
          asset={estate}
          showMiniMap={false}
          showControls={false}
          onAssetClick={this.handleParcelClick}
        />
        <Container>
          <Grid className="estate-selection" stackable>
            {this.hasReachedAddLimit() || this.hasReachedRemoveLimit() ? (
              <Grid.Row>
                <Grid.Column width={16}>
                  <Message
                    warning
                    icon="warning sign"
                    header={t('estate_detail.maximum_parcels_title')}
                    content={t('estate_detail.maximum_parcels_message', {
                      max: MAX_PARCELS_PER_TX
                    })}
                  />
                </Grid.Column>
              </Grid.Row>
            ) : null}

            <Grid.Row>
              <Grid.Column width={16}>
                <Header size="large">
                  {isCreation
                    ? t('estate_select.new_selection')
                    : t('estate_select.edit_selection')}
                </Header>
                {!isCreation &&
                  isOwner(wallet, estate.id) && (
                    <Button
                      size="tiny"
                      className="link dissolve-button"
                      onClick={onDeleteEstate}
                    >
                      <Icon name="trash" />
                      {t('estate_detail.dissolve').toUpperCase()}
                    </Button>
                  )}
                <p className="parcels-included-description">
                  {t('estate_select.description')}
                </p>
              </Grid.Column>
              {allParcels && (
                <Grid.Column width={16}>
                  <ParcelCoords
                    parcels={this.getEstateParcels()}
                    isCollapsable={false}
                  />
                </Grid.Column>
              )}
              {canEdit && (
                <Grid.Column width={16}>
                  <EstateSelectActions
                    isTxIdle={isTxIdle}
                    isCreation={isCreation}
                    onSubmit={onSubmit}
                    onCancel={isCreation ? onCreateCancel : onCancel}
                    onContinue={onContinue}
                    canContinue={this.hasParcels(parcels)}
                    canSubmit={
                      this.hasParcels(parcels) &&
                      this.haveParcelsChanged(parcels)
                    }
                  />
                  {!isCreation && this.renderTxLabel()}
                  <TxStatus.Asset
                    asset={estate}
                    name={<EstateName estate={estate} />}
                  />
                </Grid.Column>
              )}
            </Grid.Row>
          </Grid>
        </Container>
      </div>
    )
  }
}
